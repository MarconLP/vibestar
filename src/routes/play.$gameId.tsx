import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getGame, getCurrentRound, startRound, submitSongGuess, submitPlacement, getPlayerTimeline, continueGame, contestPlacement } from '@/server/functions/game'
import { useChannel } from '@/hooks/usePusher'
import { Timeline } from '@/components/game/Timeline'
import { YouTubePlayer } from '@/components/game/YouTubePlayer'
import { SongGuesser } from '@/components/game/SongGuesser'
import { Scoreboard } from '@/components/game/Scoreboard'
import { RoundResult } from '@/components/game/RoundResult'
import { GameOver } from '@/components/game/GameOver'
import type {
  GameRoundStartEvent,
  GameRoundPhaseEvent,
  GameRoundResultEvent,
  GameTurnChangeEvent,
  GameEndedEvent,
  GameContestResultEvent,
} from '@/lib/pusher/events'

type GamePhase = 'WAITING' | 'PLAYING_CLIP' | 'GUESSING' | 'PLACING' | 'REVEALING' | 'GAME_OVER'

interface TimelineEntry {
  id: string
  position: number
  song: {
    id: string
    name: string
    artist: string
    releaseYear: number
    thumbnailUrl: string | null
  }
}

export const Route = createFileRoute('/play/$gameId')({
  component: GamePlay,
  loader: async ({ params }) => {
    const result = await getGame({ data: { gameId: params.gameId } })

    if (!result.game) {
      throw redirect({ to: '/' })
    }

    const currentRound = await getCurrentRound({ data: { gameId: params.gameId } })

    return { ...result, currentRound }
  },
})

function GamePlay() {
  const { game, player, timeline: initialTimeline, currentRound: initialRound } = Route.useLoaderData()

  const [phase, setPhase] = useState<GamePhase>(
    game.status === 'FINISHED' ? 'GAME_OVER' : 'WAITING'
  )
  const [currentRound, setCurrentRound] = useState(initialRound)
  const [currentRoundNumber, setCurrentRoundNumber] = useState(game.currentRound)
  const [currentPlayerId, setCurrentPlayerId] = useState(game.currentPlayerId)
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline as TimelineEntry[])
  const [players, setPlayers] = useState(game.room.players)
  const [roundResult, setRoundResult] = useState<GameRoundResultEvent | null>(null)
  const [gameResult, setGameResult] = useState<GameEndedEvent | null>(null)
  const [guessSubmitted, setGuessSubmitted] = useState(false)
  const [myTokens, setMyTokens] = useState(player?.tokens ?? 0)
  const [isContesting, setIsContesting] = useState(false)

  const isMyTurn = currentPlayerId === player?.id

  // Refresh timeline when it's updated
  const refreshTimeline = useCallback(async () => {
    if (!player) return
    const updated = await getPlayerTimeline({ data: { playerId: player.id } })
    setTimeline(updated as TimelineEntry[])
  }, [player])

  // Subscribe to game events
  const { bind, unbind } = useChannel(`private-game-${game.id}`)

  useEffect(() => {
    bind<GameRoundStartEvent>('game:round-start', (data) => {
      setCurrentRound({
        roundId: data.roundId,
        roundNumber: data.roundNumber,
        videoId: data.videoId,
        clipStartTime: data.clipStartTime,
        clipEndTime: data.clipEndTime,
        status: 'PLAYING_CLIP',
      })
      setCurrentRoundNumber(data.roundNumber)
      setCurrentPlayerId(data.currentPlayerId)
      setPhase('PLAYING_CLIP')
      setGuessSubmitted(false)
      setRoundResult(null)
    })

    bind<GameRoundPhaseEvent>('game:round-phase', (data) => {
      setPhase(data.phase)
    })

    bind<GameRoundResultEvent>('game:round-result', (data) => {
      setRoundResult(data)
      setPhase('REVEALING')
      setIsContesting(false)

      // Update player scores and tokens (synced across all clients)
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId
            ? { ...p, score: data.timelineCount, tokens: data.playerTokens }
            : p
        )
      )

      // If it's my result, sync my token count
      if (data.playerId === player?.id) {
        setMyTokens(data.playerTokens)
      }
    })

    bind<GameContestResultEvent>('game:contest-result', (data) => {
      // Update contester's score and tokens (synced across all clients)
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.contesterId
            ? { ...p, score: data.success ? data.newTimelineCount : p.score, tokens: data.newTokenCount }
            : p
        )
      )

      // If I was the contester, sync my tokens and timeline
      if (data.contesterId === player?.id) {
        setMyTokens(data.newTokenCount)
        if (data.success) {
          refreshTimeline()
        }
      }
    })

    bind<GameTurnChangeEvent>('game:turn-change', (data) => {
      setCurrentPlayerId(data.currentPlayerId)
      setCurrentRoundNumber(data.roundNumber)
      setPhase('WAITING')
      setGuessSubmitted(false)
    })

    bind<GameEndedEvent>('game:ended', (data) => {
      setGameResult(data)
      setPhase('GAME_OVER')
    })

    return () => {
      unbind('game:round-start')
      unbind('game:round-phase')
      unbind('game:round-result')
      unbind('game:contest-result')
      unbind('game:turn-change')
      unbind('game:ended')
    }
  }, [bind, unbind, player?.id, refreshTimeline])

  useEffect(() => {
    if (phase === 'REVEALING' && roundResult?.playerId === player?.id && roundResult?.placementCorrect) {
      refreshTimeline()
    }
  }, [phase, roundResult, player, refreshTimeline])

  // Handle starting the round (for current player)
  const handleStartRound = async () => {
    await startRound({
      data: {
        gameId: game.id,
        roundNumber: currentRoundNumber,
      },
    })
  }

  // Handle song guess submission
  const handleGuessSubmit = async (guess: string) => {
    if (!currentRound) return
    setGuessSubmitted(true)

    await submitSongGuess({
      data: {
        gameId: game.id,
        roundId: currentRound.roundId,
        songNameGuess: guess,
      },
    })
  }

  // Handle timeline placement
  const handlePlacement = async (position: number) => {
    if (!currentRound) return

    await submitPlacement({
      data: {
        gameId: game.id,
        roundId: currentRound.roundId,
        position,
      },
    })
  }

  // Handle continuing after result reveal
  const handleContinue = async () => {
    if (!currentRound) return

    await continueGame({
      data: {
        gameId: game.id,
        roundNumber: currentRoundNumber,
      },
    })

    setPhase('WAITING')
    setRoundResult(null)
  }

  // Handle contesting a placement
  const handleContest = async (position: number) => {
    if (!currentRound) return
    setIsContesting(false)

    // Spend token locally immediately for responsive UI
    setMyTokens((prev) => prev - 1)

    await contestPlacement({
      data: {
        gameId: game.id,
        roundId: currentRound.roundId,
        position,
      },
    })
  }

  // Start contest mode (show timeline for placement)
  const handleStartContest = () => {
    setIsContesting(true)
  }

  // Cancel contest
  const handleCancelContest = () => {
    setIsContesting(false)
  }

  if (phase === 'GAME_OVER' && gameResult) {
    return <GameOver result={gameResult} />
  }

  const currentPlayerName = players.find((p) => p.id === currentPlayerId)?.displayName || 'Unknown'

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-800/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Round {currentRoundNumber} / {game.totalRounds}</h1>
              <p className="text-neutral-400">
                {isMyTurn ? "Your turn!" : `${currentPlayerName}'s turn`}
              </p>
            </div>
            <Scoreboard players={players} currentPlayerId={currentPlayerId} myTokens={myTokens} myPlayerId={player?.id} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Waiting State */}
              {phase === 'WAITING' && (
                <div className="p-8 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm text-center">
                  {isMyTurn ? (
                    <>
                      <p className="text-white text-lg mb-4">Ready to hear the next song?</p>
                      <button
                        onClick={handleStartRound}
                        className="px-6 py-3 rounded-xl font-semibold bg-green-500 text-black hover:bg-green-400 hover:scale-105 transition-all"
                      >
                        Play Clip
                      </button>
                    </>
                  ) : (
                    <p className="text-neutral-400 text-lg">
                      Waiting for {currentPlayerName} to play the clip...
                    </p>
                  )}
                </div>
              )}

              {/* Playing Clip */}
              {phase === 'PLAYING_CLIP' && currentRound && (
                <YouTubePlayer
                  videoId={currentRound.videoId}
                  startTime={currentRound.clipStartTime}
                  endTime={currentRound.clipEndTime}
                  onClipEnd={() => isMyTurn && setPhase('GUESSING')}
                  isMyTurn={isMyTurn}
                />
              )}

              {/* Guessing Song Name */}
              {phase === 'GUESSING' && isMyTurn && (
                <SongGuesser
                  onSubmit={handleGuessSubmit}
                  disabled={guessSubmitted}
                />
              )}

              {/* Placing on Timeline */}
              {phase === 'PLACING' && isMyTurn && (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Place the song on your timeline
                  </h2>
                  <p className="text-neutral-400 mb-4">
                    Click where you think this song belongs based on its release year
                  </p>
                  <Timeline
                    entries={timeline}
                    placingMode={true}
                    onPlacement={handlePlacement}
                  />
                </div>
              )}

              {/* Revealing Result */}
              {phase === 'REVEALING' && roundResult && !isContesting && (
                <RoundResult
                  result={roundResult}
                  isMyTurn={roundResult.playerId === player?.id}
                  onContinue={handleContinue}
                  myTokens={myTokens}
                  onStartContest={handleStartContest}
                />
              )}

              {/* Contest Mode - placing song on own timeline */}
              {phase === 'REVEALING' && isContesting && roundResult && (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-yellow-500/30 backdrop-blur-sm">
                  <h2 className="text-xl font-bold text-yellow-400 mb-2">
                    Contest! Place the song on YOUR timeline
                  </h2>
                  <p className="text-neutral-400 mb-4">
                    {roundResult.actualSong.name} by {roundResult.actualSong.artist} ({roundResult.actualSong.releaseYear})
                  </p>
                  <Timeline
                    entries={timeline}
                    placingMode={true}
                    onPlacement={handleContest}
                  />
                  <button
                    onClick={handleCancelContest}
                    className="mt-4 px-4 py-2 rounded-lg text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Watching other player */}
              {!isMyTurn && phase !== 'WAITING' && phase !== 'REVEALING' && (
                <div className="p-8 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm text-center">
                  <p className="text-neutral-400 text-lg">
                    {currentPlayerName} is {phase === 'PLAYING_CLIP' ? 'listening to the clip' : phase === 'GUESSING' ? 'guessing the song' : 'placing on their timeline'}...
                  </p>
                </div>
              )}
            </div>

            {/* Timeline Sidebar */}
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-4">Your Timeline</h2>
              <Timeline entries={timeline} placingMode={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
