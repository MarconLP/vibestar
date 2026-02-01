import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import { shuffleArray, checkPlacementCorrect, calculatePoints, SONGS_TO_WIN } from '@/lib/game/utils'
import { calculateClipStart } from '@/lib/youtube/api'
import { fuzzyMatch } from '@/lib/game/fuzzy-match'
import { triggerEvent } from '@/lib/pusher/server'
import { getSession } from '@/lib/session'
import type {
  RoomGameStartedEvent,
  GameRoundStartEvent,
  GameRoundPhaseEvent,
  GameRoundResultEvent,
  GameTurnChangeEvent,
  GameEndedEvent,
  GameContestWindowEvent,
  GameContestSubmittedEvent,
} from '@/lib/pusher/events'

// Start a game (host only)
export const startGame = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: { roomId: string; playlistId: string; totalRounds?: number }) => data
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
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

    // Each player gets their own unique song per turn
    // turnsPerPlayer = how many turns each player gets
    const turnsPerPlayer = data.totalRounds ?? Math.min(5, Math.floor((playlist.songs.length - room.players.length) / room.players.length))
    const totalRounds = turnsPerPlayer * room.players.length

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
    if (!session) {
      throw new Error('Not logged in')
    }

    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        room: {
          include: {
            players: {
              orderBy: { joinedAt: 'asc' },
              select: {
                id: true,
                userId: true,
                displayName: true,
                avatarUrl: true,
                score: true,
                tokens: true,
                isHost: true,
                joinedAt: true,
                roomId: true,
              },
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
      roundId: round.id,
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
    if (!session) {
      throw new Error('Not logged in')
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

    // Token is awarded later in revealResultsInternal when results are shown

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

const CONTEST_WINDOW_MS = 15000 // 15 seconds

// Submit timeline placement - starts contest window
export const submitPlacement = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundId: string; position: number }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
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

    // Prevent duplicate submissions
    if (round.status === 'CONTESTING' || round.status === 'REVEALING' || round.status === 'COMPLETED') {
      return { alreadyProcessed: true }
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

    // Get player's current timeline (before placing)
    const timeline = await prisma.timelineEntry.findMany({
      where: { playerId: player.id },
      include: { song: true },
      orderBy: { position: 'asc' },
    })

    // Check if placement is correct (but don't reveal yet)
    const isCorrect = checkPlacementCorrect(timeline, data.position, round.song.releaseYear)

    // Calculate points
    const points = calculatePoints(isCorrect)

    // Update guess with placement (store results but don't apply yet)
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

    // Check if any OTHER player has tokens to contest
    const otherPlayersWithTokens = round.game.room.players.filter(
      (p) => p.id !== player.id && p.tokens > 0
    )

    // If no one can contest, skip directly to revealing results
    if (otherPlayersWithTokens.length === 0) {
      return await revealResultsInternal(data.gameId, data.roundId, player, round)
    }

    // Update round status to CONTESTING and set deadline
    const contestDeadline = Date.now() + CONTEST_WINDOW_MS
    await prisma.gameRound.update({
      where: { id: data.roundId },
      data: {
        status: 'CONTESTING',
        contestDeadline: new Date(contestDeadline),
      },
    })

    // Broadcast contest window start with current player's timeline
    await triggerEvent(`private-game-${data.gameId}`, 'game:contest-window', {
      roundId: round.id,
      currentPlayerId: player.id,
      currentPlayerTimeline: timeline.map((entry) => ({
        id: entry.id,
        position: entry.position,
        song: {
          name: entry.song.name,
          artist: entry.song.artist,
          releaseYear: entry.song.releaseYear,
        },
      })),
      placementPosition: data.position,
      contestDeadline,
    } satisfies GameContestWindowEvent)

    await triggerEvent(`private-game-${data.gameId}`, 'game:round-phase', {
      phase: 'CONTESTING',
    } satisfies GameRoundPhaseEvent)

    return { contestDeadline, roundNumber: round.roundNumber }
  })

// Submit a contest guess (other players betting on a different position)
export const submitContestGuess = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundId: string; position: number }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
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
        guesses: true,
      },
    })

    if (!round) {
      throw new Error('Round not found')
    }

    // Can only contest during CONTESTING phase
    if (round.status !== 'CONTESTING') {
      throw new Error('Contest window is closed')
    }

    // Check if contest window has expired (with 2s buffer for network latency)
    const DEADLINE_BUFFER_MS = 2000
    if (round.contestDeadline && Date.now() > round.contestDeadline.getTime() + DEADLINE_BUFFER_MS) {
      throw new Error('Contest window has expired')
    }

    const player = await prisma.player.findFirst({
      where: { userId: session.user.id, roomId: round.game.room.id },
    })

    if (!player) {
      throw new Error('Player not found')
    }

    // Cannot contest your own placement
    if (player.id === round.game.currentPlayerId) {
      throw new Error('Cannot contest your own placement')
    }

    // Must have at least 1 token
    if (player.tokens < 1) {
      throw new Error('No tokens available')
    }

    // Get the original player's guess to check position
    const originalGuess = round.guesses.find(
      (g) => g.playerId === round.game.currentPlayerId
    )

    // Cannot place in the same position as the current player
    if (originalGuess?.placementPosition === data.position) {
      throw new Error('Cannot place in the same position as the current player')
    }

    // Check if already submitted a contest guess
    const existingGuess = await prisma.roundGuess.findUnique({
      where: {
        roundId_playerId: {
          roundId: data.roundId,
          playerId: player.id,
        },
      },
    })

    // Only reject if there's an existing guess with a placement already set
    if (existingGuess && existingGuess.placementPosition !== null) {
      throw new Error('Already submitted a contest guess')
    }

    // Spend the token
    await prisma.player.update({
      where: { id: player.id },
      data: { tokens: { decrement: 1 } },
    })

    // Get the current player's timeline to check if placement is correct
    const currentPlayerTimeline = await prisma.timelineEntry.findMany({
      where: { playerId: round.game.currentPlayerId! },
      include: { song: true },
      orderBy: { position: 'asc' },
    })

    // Check if this contest placement would be correct
    const isCorrect = checkPlacementCorrect(currentPlayerTimeline, data.position, round.song.releaseYear)

    // Store the contest guess
    await prisma.roundGuess.upsert({
      where: {
        roundId_playerId: {
          roundId: data.roundId,
          playerId: player.id,
        },
      },
      create: {
        roundId: data.roundId,
        playerId: player.id,
        placementPosition: data.position,
        placementCorrect: isCorrect,
        isContest: true,
      },
      update: {
        placementPosition: data.position,
        placementCorrect: isCorrect,
        isContest: true,
      },
    })

    // Get updated token count
    const updatedPlayer = await prisma.player.findUnique({
      where: { id: player.id },
      select: { tokens: true },
    })

    // Broadcast that a contest was submitted (without revealing if correct)
    await triggerEvent(`private-game-${data.gameId}`, 'game:contest-submitted', {
      contesterId: player.id,
      contesterName: player.displayName,
      position: data.position,
      newTokenCount: updatedPlayer?.tokens ?? 0,
    } satisfies GameContestSubmittedEvent)

    return { success: true, newTokenCount: updatedPlayer?.tokens ?? 0 }
  })

// Internal function to reveal results (shared between submitPlacement skip and revealResults)
async function revealResultsInternal(
  gameId: string,
  roundId: string,
  player: { id: string; displayName: string },
  round: {
    id: string
    songId: string
    roundNumber: number
    song: { name: string; artist: string; releaseYear: number }
    game: { currentPlayerId: string | null }
    guesses?: Array<{
      playerId: string
      songNameGuess: string | null
      songNameCorrect: boolean | null
      placementPosition: number | null
      placementCorrect: boolean | null
      isContest: boolean
      player: { displayName: string }
    }>
  }
) {
  // Fetch guesses if not provided (when called from submitPlacement, guesses may not be loaded)
  let guesses = round.guesses
  if (!guesses) {
    const roundWithGuesses = await prisma.gameRound.findUnique({
      where: { id: roundId },
      include: { guesses: { include: { player: true } } },
    })
    guesses = roundWithGuesses?.guesses ?? []
  }

  // Get the original guess
  const originalGuess = guesses.find(
    (g) => g.playerId === round.game.currentPlayerId
  )

  // Get contest guesses
  const contestGuesses = guesses.filter((g) => g.isContest)

  // Process results - add song to timeline for correct placements
  const results: Array<{
    playerId: string
    playerName: string
    isOriginal: boolean
    position: number | null
    isCorrect: boolean
  }> = []

  // Process original player
  if (originalGuess?.placementCorrect) {
    // Add song to original player's timeline
    const existingEntry = await prisma.timelineEntry.findUnique({
      where: {
        playerId_songId: {
          playerId: player.id,
          songId: round.songId,
        },
      },
    })

    if (!existingEntry) {
      await prisma.timelineEntry.updateMany({
        where: {
          playerId: player.id,
          position: { gte: originalGuess.placementPosition! },
        },
        data: { position: { increment: 1 } },
      })

      await prisma.timelineEntry.create({
        data: {
          playerId: player.id,
          songId: round.songId,
          position: originalGuess.placementPosition!,
          addedInRound: round.roundNumber,
        },
      })
    }

    // Update score
    await prisma.player.update({
      where: { id: player.id },
      data: { score: { increment: 1 } },
    })
  }

  // Award token if song name was correct
  if (originalGuess?.songNameCorrect) {
    await prisma.player.update({
      where: { id: player.id },
      data: { tokens: { increment: 1 } },
    })
  }

  results.push({
    playerId: player.id,
    playerName: player.displayName,
    isOriginal: true,
    position: originalGuess?.placementPosition ?? null,
    isCorrect: originalGuess?.placementCorrect ?? false,
  })

  // Process contesters
  for (const contestGuess of contestGuesses) {
    if (contestGuess.placementCorrect) {
      // Add song to contester's timeline
      const contesterTimeline = await prisma.timelineEntry.findMany({
        where: { playerId: contestGuess.playerId },
        orderBy: { position: 'asc' },
      })

      const existingEntry = await prisma.timelineEntry.findUnique({
        where: {
          playerId_songId: {
            playerId: contestGuess.playerId,
            songId: round.songId,
          },
        },
      })

      if (!existingEntry) {
        // Find correct position in contester's timeline based on release year
        let insertPosition = 0
        for (const entry of contesterTimeline) {
          const entrySong = await prisma.song.findUnique({ where: { id: entry.songId } })
          if (entrySong && entrySong.releaseYear <= round.song.releaseYear) {
            insertPosition = entry.position + 1
          }
        }

        await prisma.timelineEntry.updateMany({
          where: {
            playerId: contestGuess.playerId,
            position: { gte: insertPosition },
          },
          data: { position: { increment: 1 } },
        })

        await prisma.timelineEntry.create({
          data: {
            playerId: contestGuess.playerId,
            songId: round.songId,
            position: insertPosition,
            addedInRound: round.roundNumber,
          },
        })
      }

      // Update contester's score
      await prisma.player.update({
        where: { id: contestGuess.playerId },
        data: { score: { increment: 1 } },
      })
    }

    results.push({
      playerId: contestGuess.playerId,
      playerName: contestGuess.player.displayName,
      isOriginal: false,
      position: contestGuess.placementPosition,
      isCorrect: contestGuess.placementCorrect ?? false,
    })
  }

  // Update round status
  await prisma.gameRound.update({
    where: { id: roundId },
    data: { status: 'REVEALING' },
  })

  // Get updated player data
  const updatedPlayer = await prisma.player.findUnique({
    where: { id: player.id },
    select: { tokens: true },
  })

  const updatedTimeline = await prisma.timelineEntry.findMany({
    where: { playerId: player.id },
  })

  // Get the current player's timeline with song details (for result display)
  const currentPlayerTimeline = await prisma.timelineEntry.findMany({
    where: { playerId: player.id },
    include: { song: true },
    orderBy: { position: 'asc' },
  })

  // Broadcast results
  await triggerEvent(`private-game-${gameId}`, 'game:round-result', {
    playerId: player.id,
    songNameGuess: originalGuess?.songNameGuess ?? null,
    songNameCorrect: originalGuess?.songNameCorrect ?? false,
    placementCorrect: originalGuess?.placementCorrect ?? false,
    placementPosition: originalGuess?.placementPosition ?? 0,
    timelineCount: updatedTimeline.length,
    canBeContested: false,
    tokenEarned: originalGuess?.songNameCorrect ?? false,
    playerTokens: updatedPlayer?.tokens ?? 0,
    actualSong: {
      name: round.song.name,
      artist: round.song.artist,
      releaseYear: round.song.releaseYear,
    },
    contestResults: results,
    currentPlayerTimeline: currentPlayerTimeline.map((entry) => ({
      id: entry.id,
      position: entry.position,
      song: {
        name: entry.song.name,
        artist: entry.song.artist,
        releaseYear: entry.song.releaseYear,
      },
    })),
  } satisfies GameRoundResultEvent)

  await triggerEvent(`private-game-${gameId}`, 'game:round-phase', {
    phase: 'REVEALING',
  } satisfies GameRoundPhaseEvent)

  return { results, skippedContest: true }
}

// Reveal results after contest window
export const revealResults = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundId: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
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
        guesses: {
          include: { player: true },
        },
      },
    })

    if (!round) {
      throw new Error('Round not found')
    }

    // Only during CONTESTING phase
    if (round.status !== 'CONTESTING') {
      throw new Error('Not in contest phase')
    }

    const player = await prisma.player.findFirst({
      where: { userId: session.user.id, roomId: round.game.room.id },
    })

    if (!player) {
      throw new Error('Player not found')
    }

    // Only current player can reveal (after waiting for contest window)
    if (round.game.currentPlayerId !== player.id) {
      throw new Error('Only the current player can reveal results')
    }

    // Check if contest window has passed
    if (round.contestDeadline && Date.now() < round.contestDeadline.getTime()) {
      throw new Error('Contest window has not ended yet')
    }

    return await revealResultsInternal(data.gameId, data.roundId, player, round)
  })

// Advance the game to next turn or end
// Each turn = new round = new song for the next player
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

  // Mark current round as completed
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

  // Check if any player has reached SONGS_TO_WIN on their timeline
  const playerTimelines = await Promise.all(
    players.map(async (p) => {
      const timeline = await prisma.timelineEntry.findMany({
        where: { playerId: p.id },
      })
      return { player: p, count: timeline.length }
    })
  )

  const winner = playerTimelines.find((pt) => pt.count >= SONGS_TO_WIN)
  const isGameOver = winner || currentRoundNumber >= game.totalRounds

  if (isGameOver) {
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

    // Determine winner by timeline count (most songs wins)
    const sortedByTimeline = [...playerTimelines].sort((a, b) => b.count - a.count)
    const gameWinner = sortedByTimeline[0]

    await triggerEvent(`private-game-${gameId}`, 'game:ended', {
      winner: {
        playerId: gameWinner.player.id,
        displayName: gameWinner.player.displayName,
        score: gameWinner.count,
      },
      finalScores: sortedByTimeline.map((pt) => ({
        playerId: pt.player.id,
        displayName: pt.player.displayName,
        score: pt.count,
      })),
    } satisfies GameEndedEvent)
  } else {
    // Move to next round with next player (each turn = new song)
    const nextRound = currentRoundNumber + 1

    await prisma.game.update({
      where: { id: gameId },
      data: {
        currentRound: nextRound,
        currentPlayerId: players[nextPlayerIndex].id,
      },
    })

    await triggerEvent(`private-game-${gameId}`, 'game:turn-change', {
      currentPlayerId: players[nextPlayerIndex].id,
      roundNumber: nextRound,
    } satisfies GameTurnChangeEvent)
  }
}

// Continue to next turn (called after viewing result)
export const continueGame = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { gameId: string; roundNumber: number }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
    }

    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        room: {
          include: { players: true },
        },
      },
    })

    if (!game) {
      throw new Error('Game not found')
    }

    // Only the current player can continue
    const player = game.room.players.find((p) => p.userId === session.user.id)
    if (!player || game.currentPlayerId !== player.id) {
      throw new Error('Not your turn')
    }

    // Advance the game
    await advanceGame(data.gameId, data.roundNumber)

    return { success: true }
  })

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

