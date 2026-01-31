import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/start-server-core'
import { prisma } from '@/db'
import { auth } from '@/lib/auth'
import { shuffleArray, checkPlacementCorrect, calculatePoints } from '@/lib/game/utils'
import { calculateClipStart } from '@/lib/youtube/api'
import { fuzzyMatch } from '@/lib/game/fuzzy-match'
import { triggerEvent } from '@/lib/pusher/server'
import type {
  RoomGameStartedEvent,
  GameRoundStartEvent,
  GameRoundPhaseEvent,
  GameRoundResultEvent,
  GameTurnChangeEvent,
  GameEndedEvent,
} from '@/lib/pusher/events'

// Get the current user's session
async function getSession() {
  const request = getRequest()
  return await auth.api.getSession({ headers: request.headers })
}

// Start a game (host only)
export const startGame = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: { roomId: string; playlistId: string; totalRounds?: number }) => data
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: data.roomId },
      include: { players: { orderBy: { joinedAt: 'asc' } } },
    })

    if (!room) {
      throw new Error('Room not found')
    }

    if (room.hostId !== session.user.id) {
      throw new Error('Only the host can start the game')
    }

    if (room.status !== 'WAITING') {
      throw new Error('Game already started')
    }

    if (room.players.length < 1) {
      throw new Error('Need at least 1 player to start')
    }

    // Fetch playlist
    const playlist = await prisma.playlist.findUnique({
      where: { id: data.playlistId },
      include: { songs: true },
    })

    if (!playlist) {
      throw new Error('Playlist not found')
    }

    const totalRounds = data.totalRounds ?? Math.min(10, playlist.songs.length - room.players.length)

    if (playlist.songs.length < totalRounds + room.players.length) {
      throw new Error('Not enough songs in playlist')
    }

    // Shuffle songs and select for rounds + starting songs
    const shuffledSongs = shuffleArray(playlist.songs)
    const roundSongs = shuffledSongs.slice(0, totalRounds)
    const startingSongs = shuffledSongs.slice(totalRounds, totalRounds + room.players.length)

    // Create game with rounds
    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        playlistId: data.playlistId,
        totalRounds,
        currentRound: 1,
        currentPlayerId: room.players[0].id,
        rounds: {
          create: roundSongs.map((song, index) => {
            const clipStart = calculateClipStart(song.duration, room.clipDuration)
            return {
              roundNumber: index + 1,
              songId: song.id,
              clipStartTime: clipStart,
              clipEndTime: clipStart + room.clipDuration,
            }
          }),
        },
      },
      include: {
        rounds: {
          include: { song: true },
          orderBy: { roundNumber: 'asc' },
        },
      },
    })

    // Give each player a starting song
    for (let i = 0; i < room.players.length; i++) {
      await prisma.timelineEntry.create({
        data: {
          playerId: room.players[i].id,
          songId: startingSongs[i].id,
          position: 0,
          addedInRound: 0,
        },
      })
    }

    // Update room status
    await prisma.gameRoom.update({
      where: { id: room.id },
      data: { status: 'ACTIVE' },
    })

    // Notify players
    await triggerEvent(`presence-room-${room.code}`, 'room:game-started', {
      gameId: game.id,
    } satisfies RoomGameStartedEvent)

    return game
  })

// Get game state
export const getGame = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { gameId: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        room: {
          include: {
            players: {
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
        rounds: {
          include: { song: true },
          orderBy: { roundNumber: 'asc' },
        },
        playlist: true,
      },
    })

    if (!game) {
      throw new Error('Game not found')
    }

    // Get the current player's info
    const player = game.room.players.find((p) => p.userId === session.user.id)

    // Get the player's timeline
    const timeline = player
      ? await prisma.timelineEntry.findMany({
          where: { playerId: player.id },
          include: { song: true },
          orderBy: { position: 'asc' },
        })
      : []

    return { game, player, timeline }
  })

// Get current round info (without revealing song name until needed)
export const getCurrentRound = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { gameId: string }) => data)
  .handler(async ({ data }) => {
    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        rounds: {
          include: { song: true },
        },
      },
    })

    if (!game) {
      throw new Error('Game not found')
    }

    const currentRound = game.rounds.find((r) => r.roundNumber === game.currentRound)
    if (!currentRound) {
      return null
    }

    // Don't reveal song name - only return what's needed for playback
    return {
      roundId: currentRound.id,
      roundNumber: currentRound.roundNumber,
      videoId: currentRound.song.youtubeVideoId,
      clipStartTime: currentRound.clipStartTime,
      clipEndTime: currentRound.clipEndTime,
      status: currentRound.status,
    }
  })

// Start a round (trigger clip playback)
export const startRound = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundNumber: number }) => data)
  .handler(async ({ data }) => {
    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        room: true,
        rounds: {
          where: { roundNumber: data.roundNumber },
          include: { song: true },
        },
      },
    })

    if (!game) {
      throw new Error('Game not found')
    }

    const round = game.rounds[0]
    if (!round) {
      throw new Error('Round not found')
    }

    await prisma.gameRound.update({
      where: { id: round.id },
      data: {
        status: 'PLAYING_CLIP',
        startedAt: new Date(),
      },
    })

    await triggerEvent(`private-game-${game.id}`, 'game:round-start', {
      roundNumber: round.roundNumber,
      currentPlayerId: game.currentPlayerId!,
      clipStartTime: round.clipStartTime,
      clipEndTime: round.clipEndTime,
      videoId: round.song.youtubeVideoId,
    } satisfies GameRoundStartEvent)

    return round
  })

// Submit song name guess
export const submitSongGuess = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundId: string; songNameGuess: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const round = await prisma.gameRound.findUnique({
      where: { id: data.roundId },
      include: {
        song: true,
        game: { include: { room: true } },
      },
    })

    if (!round) {
      throw new Error('Round not found')
    }

    const player = await prisma.player.findFirst({
      where: { userId: session.user.id, roomId: round.game.room.id },
    })

    if (!player) {
      throw new Error('Player not found')
    }

    if (round.game.currentPlayerId !== player.id) {
      throw new Error('Not your turn')
    }

    // Check if guess is correct using fuzzy matching
    const isCorrect = fuzzyMatch(data.songNameGuess, round.song.name)

    // Create or update guess
    const guess = await prisma.roundGuess.upsert({
      where: {
        roundId_playerId: {
          roundId: data.roundId,
          playerId: player.id,
        },
      },
      create: {
        roundId: data.roundId,
        playerId: player.id,
        songNameGuess: data.songNameGuess,
        songNameCorrect: isCorrect,
      },
      update: {
        songNameGuess: data.songNameGuess,
        songNameCorrect: isCorrect,
      },
    })

    // Update round status to placing
    await prisma.gameRound.update({
      where: { id: data.roundId },
      data: { status: 'PLACING' },
    })

    await triggerEvent(`private-game-${data.gameId}`, 'game:round-phase', {
      phase: 'PLACING',
    } satisfies GameRoundPhaseEvent)

    return { guess, isCorrect }
  })

// Submit timeline placement
export const submitPlacement = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundId: string; position: number }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const round = await prisma.gameRound.findUnique({
      where: { id: data.roundId },
      include: {
        song: true,
        game: {
          include: {
            room: {
              include: { players: { orderBy: { joinedAt: 'asc' } } },
            },
          },
        },
      },
    })

    if (!round) {
      throw new Error('Round not found')
    }

    const player = await prisma.player.findFirst({
      where: { userId: session.user.id, roomId: round.game.room.id },
    })

    if (!player) {
      throw new Error('Player not found')
    }

    // Get player's current timeline
    const timeline = await prisma.timelineEntry.findMany({
      where: { playerId: player.id },
      include: { song: true },
      orderBy: { position: 'asc' },
    })

    // Check if placement is correct
    const isCorrect = checkPlacementCorrect(timeline, data.position, round.song.releaseYear)

    // Get the existing guess for song name
    const guess = await prisma.roundGuess.findUnique({
      where: {
        roundId_playerId: {
          roundId: data.roundId,
          playerId: player.id,
        },
      },
    })

    // Calculate points
    const points = calculatePoints(guess?.songNameCorrect ?? false, isCorrect)

    // Update guess with placement
    await prisma.roundGuess.update({
      where: {
        roundId_playerId: {
          roundId: data.roundId,
          playerId: player.id,
        },
      },
      data: {
        placementPosition: data.position,
        placementCorrect: isCorrect,
        pointsEarned: points,
      },
    })

    // If placement is correct, add song to timeline
    if (isCorrect) {
      // Shift existing entries at or after this position
      await prisma.timelineEntry.updateMany({
        where: {
          playerId: player.id,
          position: { gte: data.position },
        },
        data: {
          position: { increment: 1 },
        },
      })

      // Add the new song
      await prisma.timelineEntry.create({
        data: {
          playerId: player.id,
          songId: round.songId,
          position: data.position,
          addedInRound: round.roundNumber,
        },
      })
    }

    // Update player score
    await prisma.player.update({
      where: { id: player.id },
      data: {
        score: { increment: points },
      },
    })

    // Update round status
    await prisma.gameRound.update({
      where: { id: data.roundId },
      data: {
        status: 'REVEALING',
      },
    })

    // Broadcast result
    await triggerEvent(`private-game-${data.gameId}`, 'game:round-result', {
      playerId: player.id,
      songNameGuess: guess?.songNameGuess ?? null,
      songNameCorrect: guess?.songNameCorrect ?? false,
      placementCorrect: isCorrect,
      pointsEarned: points,
      actualSong: {
        name: round.song.name,
        artist: round.song.artist,
        releaseYear: round.song.releaseYear,
      },
    } satisfies GameRoundResultEvent)

    // Advance to next turn/round
    await advanceGame(data.gameId, round.roundNumber)

    return { isCorrect, points }
  })

// Advance the game to next turn or end
async function advanceGame(gameId: string, currentRoundNumber: number) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      room: {
        include: { players: { orderBy: { joinedAt: 'asc' } } },
      },
    },
  })

  if (!game) return

  const players = game.room.players
  const currentPlayerIndex = players.findIndex((p) => p.id === game.currentPlayerId)
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length

  // Check if we've completed a full cycle of turns
  const isEndOfRound = nextPlayerIndex === 0

  if (isEndOfRound) {
    // Move to next round or end game
    if (currentRoundNumber >= game.totalRounds) {
      // Game over
      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'FINISHED',
          endedAt: new Date(),
        },
      })

      await prisma.gameRoom.update({
        where: { id: game.roomId },
        data: { status: 'FINISHED' },
      })

      // Determine winner
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
      const winner = sortedPlayers[0]

      await triggerEvent(`private-game-${gameId}`, 'game:ended', {
        winner: {
          playerId: winner.id,
          displayName: winner.displayName,
          score: winner.score,
        },
        finalScores: sortedPlayers.map((p) => ({
          playerId: p.id,
          displayName: p.displayName,
          score: p.score,
        })),
      } satisfies GameEndedEvent)
    } else {
      // Start next round
      const nextRound = currentRoundNumber + 1

      await prisma.game.update({
        where: { id: gameId },
        data: {
          currentRound: nextRound,
          currentPlayerId: players[0].id,
        },
      })

      await prisma.gameRound.update({
        where: {
          gameId_roundNumber: {
            gameId,
            roundNumber: currentRoundNumber,
          },
        },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      })

      await triggerEvent(`private-game-${gameId}`, 'game:turn-change', {
        currentPlayerId: players[0].id,
      } satisfies GameTurnChangeEvent)
    }
  } else {
    // Same round, next player's turn
    await prisma.game.update({
      where: { id: gameId },
      data: {
        currentPlayerId: players[nextPlayerIndex].id,
      },
    })

    await triggerEvent(`private-game-${gameId}`, 'game:turn-change', {
      currentPlayerId: players[nextPlayerIndex].id,
    } satisfies GameTurnChangeEvent)
  }
}

// Get player's timeline
export const getPlayerTimeline = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { playerId: string }) => data)
  .handler(async ({ data }) => {
    const timeline = await prisma.timelineEntry.findMany({
      where: { playerId: data.playerId },
      include: { song: true },
      orderBy: { position: 'asc' },
    })

    return timeline
  })
