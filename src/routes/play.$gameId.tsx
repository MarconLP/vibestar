import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getGame, getCurrentRound, startRound, submitSongGuess, submitPlacement, getPlayerTimeline, continueGame } from '@/server/functions/game'
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

  const isMyTurn = currentPlayerId === player?.id

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

      // Update player scores
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId
            ? { ...p, score: p.score + data.pointsEarned }
            : p
        )
      )
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
      unbind('game:turn-change')
      unbind('game:ended')
    }
  }, [bind, unbind])

  // Refresh timeline when it's updated
  const refreshTimeline = useCallback(async () => {
    if (!player) return
    const updated = await getPlayerTimeline({ data: { playerId: player.id } })
    setTimeline(updated as TimelineEntry[])
  }, [player])

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

  if (phase === 'GAME_OVER' && gameResult) {
    return <GameOver result={gameResult} />
  }

  const currentPlayerName = players.find((p) => p.id === currentPlayerId)?.displayName || 'Unknown'

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: 'linear-gradient(135deg, #0c1a2b 0%, #1a2332 50%, #16202e 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Game Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-white">
            <h1 className="text-2xl font-bold">Round {currentRoundNumber} / {game.totalRounds}</h1>
            <p className="text-gray-400">
              {isMyTurn ? "Your turn!" : `${currentPlayerName}'s turn`}
            </p>
          </div>
          <Scoreboard players={players} currentPlayerId={currentPlayerId} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Waiting State */}
            {phase === 'WAITING' && (
              <div
                className="p-8 rounded-xl border text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
                  borderColor: 'rgba(139, 92, 246, 0.2)',
                }}
              >
                {isMyTurn ? (
                  <>
                    <p className="text-white text-lg mb-4">Ready to hear the next song?</p>
                    <button
                      onClick={handleStartRound}
                      className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transition-transform"
                    >
                      Play Clip
                    </button>
                  </>
                ) : (
                  <p className="text-gray-400 text-lg">
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
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
                  borderColor: 'rgba(139, 92, 246, 0.2)',
                }}
              >
                <h2 className="text-xl font-bold text-white mb-4">
                  Place the song on your timeline
                </h2>
                <p className="text-gray-400 mb-4">
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
            {phase === 'REVEALING' && roundResult && (
              <RoundResult
                result={roundResult}
                isMyTurn={roundResult.playerId === player?.id}
                onContinue={handleContinue}
              />
            )}

            {/* Watching other player */}
            {!isMyTurn && phase !== 'WAITING' && phase !== 'REVEALING' && (
              <div
                className="p-8 rounded-xl border text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
                  borderColor: 'rgba(139, 92, 246, 0.2)',
                }}
              >
                <p className="text-gray-400 text-lg">
                  {currentPlayerName} is {phase === 'PLAYING_CLIP' ? 'listening to the clip' : phase === 'GUESSING' ? 'guessing the song' : 'placing on their timeline'}...
                </p>
              </div>
            )}
          </div>

          {/* Timeline Sidebar */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.2)',
            }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Your Timeline</h2>
            <Timeline entries={timeline} placingMode={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
