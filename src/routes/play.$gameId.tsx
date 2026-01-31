import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getGame, getCurrentRound, startRound, submitSongGuess, submitPlacement, getPlayerTimeline, continueGame, submitContestGuess, revealResults } from '@/server/functions/game'
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
  GameContestWindowEvent,
  GameContestSubmittedEvent,
} from '@/lib/pusher/events'

type GamePhase = 'WAITING' | 'PLAYING_CLIP' | 'GUESSING' | 'PLACING' | 'CONTESTING' | 'REVEALING' | 'GAME_OVER'

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
  const [contestSubmitted, setContestSubmitted] = useState(false)

  // Contest window state
  const [contestWindow, setContestWindow] = useState<{
    currentPlayerTimeline: Array<{ id: string; position: number; song: { name: string; artist: string; releaseYear: number } }>
    placementPosition: number
    deadline: number
  } | null>(null)
  const [contestTimeRemaining, setContestTimeRemaining] = useState(0)
  const [contestSubmissions, setContestSubmissions] = useState<Array<{ contesterId: string; contesterName: string; position: number }>>([])

  const isMyTurn = currentPlayerId === player?.id

  // Refresh timeline when it's updated
  const refreshTimeline = useCallback(async () => {
    if (!player) return
    const updated = await getPlayerTimeline({ data: { playerId: player.id } })
    setTimeline(updated as TimelineEntry[])
  }, [player])

  // Contest window countdown - auto-reveal when timer ends
  useEffect(() => {
    if (!contestWindow) return

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((contestWindow.deadline - Date.now()) / 1000))
      setContestTimeRemaining(remaining)

      // Auto-reveal when timer hits 0 (only current player triggers this)
      if (remaining === 0 && isMyTurn && currentRound) {
        clearInterval(timer)
        revealResults({
          data: {
            gameId: game.id,
            roundId: currentRound.roundId,
          },
        })
      }
    }, 100)

    return () => clearInterval(timer)
  }, [contestWindow, isMyTurn, currentRound, game.id])

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

    bind<GameContestWindowEvent>('game:contest-window', (data) => {
      setContestWindow({
        currentPlayerTimeline: data.currentPlayerTimeline,
        placementPosition: data.placementPosition,
        deadline: data.contestDeadline,
      })
      setContestTimeRemaining(Math.ceil((data.contestDeadline - Date.now()) / 1000))
      setContestSubmissions([])
      setContestSubmitted(false)
    })

    bind<GameContestSubmittedEvent>('game:contest-submitted', (data) => {
      setContestSubmissions((prev) => [...prev, {
        contesterId: data.contesterId,
        contesterName: data.contesterName,
        position: data.position,
      }])

      // Update contester's token count
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.contesterId
            ? { ...p, tokens: data.newTokenCount }
            : p
        )
      )

      // If I was the contester, sync my tokens
      if (data.contesterId === player?.id) {
        setMyTokens(data.newTokenCount)
      }
    })

    bind<GameRoundResultEvent>('game:round-result', (data) => {
      setRoundResult(data)
      setPhase('REVEALING')
      setContestWindow(null)

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

      // Refresh timeline for everyone who might have gotten a song
      refreshTimeline()
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
      unbind('game:contest-window')
      unbind('game:contest-submitted')
      unbind('game:round-result')
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

  // Handle submitting a contest guess
  const handleContestSubmit = async (position: number) => {
    if (!currentRound) return

    try {
      // Optimistically update UI
      setContestSubmitted(true)
      setMyTokens((prev) => prev - 1)

      const result = await submitContestGuess({
        data: {
          gameId: game.id,
          roundId: currentRound.roundId,
          position,
        },
      })

      console.log('Contest submitted successfully:', result)
    } catch (error) {
      // Revert optimistic updates on failure
      console.error('Contest submission failed:', error)
      setContestSubmitted(false)
      setMyTokens((prev) => prev + 1)
      // Could add a toast notification here
    }
  }

  // Handle revealing results (current player only, after contest window)
  const handleRevealResults = async () => {
    if (!currentRound) return

    await revealResults({
      data: {
        gameId: game.id,
        roundId: currentRound.roundId,
      },
    })
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

              {/* Contest Window - other players can place on current player's timeline */}
              {phase === 'CONTESTING' && contestWindow && (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-yellow-500/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-yellow-400">
                      {isMyTurn ? 'Waiting for contests...' : 'Contest Window!'}
                    </h2>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-bold">
                      {contestTimeRemaining}s
                    </div>
                  </div>

                  {isMyTurn ? (
                    // Current player sees their timeline and waits
                    <div>
                      <p className="text-neutral-400 mb-4">
                        Other players can contest your placement. You placed the song at position {contestWindow.placementPosition + 1}.
                      </p>
                      {contestSubmissions.length > 0 && (
                        <div className="mb-4 p-3 rounded-xl bg-neutral-800/50">
                          <p className="text-sm text-neutral-400 mb-2">Contests submitted:</p>
                          {contestSubmissions.map((sub) => (
                            <p key={sub.contesterId} className="text-white">
                              {sub.contesterName} placed at position {sub.position + 1}
                            </p>
                          ))}
                        </div>
                      )}
                      <Timeline
                        entries={contestWindow.currentPlayerTimeline.map((e, i) => ({
                          ...e,
                          song: { ...e.song, id: `temp-${i}`, thumbnailUrl: null },
                        }))}
                        placingMode={false}
                        guessPosition={contestWindow.placementPosition}
                      />
                      {contestTimeRemaining === 0 && (
                        <button
                          onClick={handleRevealResults}
                          className="mt-4 w-full py-3 px-4 rounded-xl font-semibold bg-green-500 text-black transition-all duration-200 hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Reveal Results
                        </button>
                      )}
                    </div>
                  ) : (
                    // Other players can contest
                    <div>
                      <p className="text-neutral-400 mb-4">
                        {currentPlayerName} placed the song at position {contestWindow.placementPosition + 1}.
                        {myTokens > 0 && !contestSubmitted && ' Spend a token to contest with your own placement!'}
                      </p>
                      {contestSubmitted ? (
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                          <p className="text-yellow-400 font-medium">Contest submitted! Waiting for results...</p>
                        </div>
                      ) : myTokens > 0 ? (
                        <>
                          <p className="text-sm text-neutral-500 mb-4">
                            Click where YOU think the song belongs on {currentPlayerName}'s timeline:
                          </p>
                          <Timeline
                            entries={contestWindow.currentPlayerTimeline.map((e, i) => ({
                              ...e,
                              song: { ...e.song, id: `temp-${i}`, thumbnailUrl: null },
                            }))}
                            placingMode={true}
                            onPlacement={handleContestSubmit}
                            blockedPosition={contestWindow.placementPosition}
                            guessPosition={contestWindow.placementPosition}
                          />
                          <p className="text-xs text-neutral-500 mt-2 text-center">
                            You have {myTokens} token{myTokens !== 1 ? 's' : ''}. This will cost 1 token.
                          </p>
                        </>
                      ) : (
                        <div className="p-4 rounded-xl bg-neutral-800/50 text-center">
                          <p className="text-neutral-400">No tokens to contest. Waiting for results...</p>
                          <Timeline
                            entries={contestWindow.currentPlayerTimeline.map((e, i) => ({
                              ...e,
                              song: { ...e.song, id: `temp-${i}`, thumbnailUrl: null },
                            }))}
                            placingMode={false}
                            guessPosition={contestWindow.placementPosition}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Revealing Result */}
              {phase === 'REVEALING' && roundResult && (
                <RoundResult
                  result={roundResult}
                  isMyTurn={roundResult.playerId === player?.id}
                  onContinue={handleContinue}
                  myTokens={myTokens}
                  otherPlayersCount={players.length - 1}
                />
              )}

              {/* Watching other player */}
              {!isMyTurn && phase !== 'WAITING' && phase !== 'CONTESTING' && phase !== 'REVEALING' && (
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
