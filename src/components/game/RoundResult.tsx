import { Check, X, Music, Coins, Trophy, Sparkles, Crown, XCircle } from 'lucide-react'
import { SONGS_TO_WIN } from '@/lib/game/utils'
import type { GameRoundResultEvent } from '@/lib/pusher/events'

interface RoundResultProps {
  result: GameRoundResultEvent
  isMyTurn: boolean
  onContinue: () => void
  myTokens?: number
  otherPlayersCount?: number
}

export function RoundResult({ result, isMyTurn, onContinue }: RoundResultProps) {
  const { songNameGuess, songNameCorrect, placementCorrect, timelineCount, actualSong, tokenEarned, contestResults } = result

  const hasContests = contestResults && contestResults.length > 1
  const winners = contestResults?.filter((cr) => cr.isCorrect) ?? []
  const losers = contestResults?.filter((cr) => !cr.isCorrect) ?? []

  // DEBUG: Remove this after testing
  console.log('RoundResult debug:', { contestResults, hasContests, winnersCount: winners.length, losersCount: losers.length })

  return (
    <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-6 text-center">
        {isMyTurn ? 'Your Result' : 'Round Result'}
      </h2>

      {/* Song Reveal */}
      <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500">
            <Music className="w-6 h-6 text-black" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{actualSong.name}</p>
            <p className="text-neutral-400">{actualSong.artist}</p>
            <p className="text-sm text-green-400 font-medium">
              Released: {actualSong.releaseYear}
            </p>
          </div>
        </div>
      </div>

      {/* Contest Results - Featured Section */}
      {hasContests && (
        <div className="mb-6 space-y-4">
          {/* Contest Header */}
          <div className="flex items-center justify-center gap-2 py-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-yellow-400">Contest Results</h3>
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>

          {/* Summary Banner */}
          <div className={`p-4 rounded-xl text-center ${
            winners.length > 0
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30'
              : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30'
          }`}>
            {winners.length > 0 ? (
              <>
                <p className="text-lg font-bold text-white mb-1">
                  {winners.length === 1 ? (
                    <>{winners[0].playerName} wins the song!</>
                  ) : (
                    <>{winners.length} players got it right!</>
                  )}
                </p>
                <p className="text-sm text-green-400">
                  {winners.map(w => w.playerName).join(' & ')} added "{actualSong.name}" to their timeline
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-white mb-1">Nobody got it right!</p>
                <p className="text-sm text-red-400">The song was not added to anyone's timeline</p>
              </>
            )}
          </div>

          {/* Winners Cards */}
          {winners.length > 0 && (
            <div className="space-y-2">
              {winners.map((winner) => (
                <div
                  key={winner.playerId}
                  className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border-2 border-green-500/40"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-lg">{winner.playerName}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        {winner.isOriginal ? 'Original' : 'Contest'}
                      </span>
                    </div>
                    <p className="text-green-400 text-sm">
                      Placed at position {(winner.position ?? 0) + 1} — Correct!
                    </p>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20">
                    <Sparkles className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-bold">+1 Song</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Losers - Collapsed */}
          {losers.length > 0 && (
            <div className="p-4 rounded-xl bg-neutral-800/30 border border-white/5">
              <p className="text-neutral-400 text-sm font-medium mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Incorrect placements ({losers.length})
              </p>
              <div className="space-y-2">
                {losers.map((loser) => (
                  <div
                    key={loser.playerId}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <span className="text-neutral-300 text-sm">{loser.playerName}</span>
                      <span className="text-neutral-500 text-xs">
                        ({loser.isOriginal ? 'Original' : 'Contest'})
                      </span>
                    </div>
                    <span className="text-neutral-500 text-sm">
                      Position {(loser.position ?? 0) + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regular Results (shown when no contests) */}
      {!hasContests && (
        <div className="space-y-4 mb-6">
          {/* Song Name Result */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50 border border-white/5">
            <div>
              <p className="text-neutral-400 text-sm">Song Name Guess</p>
              <p className="text-white">
                {songNameGuess || <span className="text-neutral-500 italic">No guess</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {songNameCorrect ? (
                <>
                  <span className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                    <Coins className="w-4 h-4" />
                    +1 token
                  </span>
                  <div className="p-1 rounded-full bg-green-500">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </>
              ) : (
                <div className="p-1 rounded-full bg-red-500">
                  <X className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Placement Result */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50 border border-white/5">
            <div>
              <p className="text-neutral-400 text-sm">Timeline Placement</p>
              <p className="text-white">
                {placementCorrect ? 'Correct! Song added to timeline' : 'Wrong position'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {placementCorrect ? (
                <div className="p-1 rounded-full bg-green-500">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-red-500">
                  <X className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Song Name Result (when contests exist, show separately) */}
      {hasContests && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-neutral-800/50 border border-white/5">
          <div>
            <p className="text-neutral-400 text-sm">Song Name Guess</p>
            <p className="text-white">
              {songNameGuess || <span className="text-neutral-500 italic">No guess</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {songNameCorrect ? (
              <>
                <span className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                  <Coins className="w-4 h-4" />
                  +1 token
                </span>
                <div className="p-1 rounded-full bg-green-500">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </>
            ) : (
              <div className="p-1 rounded-full bg-red-500">
                <X className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token earned notification */}
      {isMyTurn && tokenEarned && (
        <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
          <p className="text-yellow-400 font-medium flex items-center justify-center gap-2">
            <Coins className="w-5 h-5" />
            You earned a token! Use it to contest other players' placements.
          </p>
        </div>
      )}

      {/* Progress to Win */}
      <div className="text-center mb-6">
        <p className="text-neutral-400 mb-2">Timeline Progress</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-bold text-green-400">{timelineCount}</span>
          <span className="text-2xl text-neutral-500">/</span>
          <span className="text-2xl text-neutral-400">{SONGS_TO_WIN}</span>
        </div>
        <p className="text-sm text-neutral-500 mt-1">
          {SONGS_TO_WIN - timelineCount} more to win!
        </p>
      </div>

      {/* Continue Button - only for the player whose turn it was */}
      {isMyTurn ? (
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-xl font-semibold bg-green-500 text-black transition-all duration-200 hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue
        </button>
      ) : (
        <p className="text-center text-neutral-400">
          Waiting for player to continue...
        </p>
      )}
    </div>
  )
}
