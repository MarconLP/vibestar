import { Check, X, Music, Coins, Trophy, Target, Sparkles } from 'lucide-react'
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
  const contesters = contestResults?.filter((cr) => !cr.isOriginal) ?? []

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
        <div className="mb-6 rounded-xl overflow-hidden border border-yellow-500/30">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 border-b border-yellow-500/30">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-bold text-yellow-400">Contest Results</h3>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-center text-sm text-yellow-400/70 mt-1">
              {contesters.length} player{contesters.length !== 1 ? 's' : ''} contested this placement
            </p>
          </div>

          {/* Winners Section */}
          {winners.length > 0 && (
            <div className="bg-green-500/10 p-4 border-b border-yellow-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-green-400" />
                <p className="text-green-400 font-semibold text-sm uppercase tracking-wide">
                  {winners.length === 1 ? 'Winner' : 'Winners'} - Song Added to Timeline!
                </p>
              </div>
              <div className="space-y-2">
                {winners.map((winner, index) => (
                  <div
                    key={winner.playerId}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-500/20 border border-green-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{winner.playerName}</p>
                        <p className="text-xs text-green-400/70">
                          {winner.isOriginal ? 'Original placement' : 'Contest winner'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-medium">
                        Position {(winner.position ?? 0) + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Placements */}
          <div className="bg-neutral-900/50 p-4">
            <p className="text-neutral-400 font-medium text-sm mb-3">All Placements</p>
            <div className="space-y-2">
              {contestResults?.map((cr) => (
                <div
                  key={cr.playerId}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    cr.isCorrect
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-neutral-800/50 border border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        cr.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {cr.isCorrect ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm">{cr.playerName}</p>
                      <p className="text-xs text-neutral-500">
                        {cr.isOriginal ? 'Original' : 'Contest'} • Position {(cr.position ?? 0) + 1}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      cr.isCorrect ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {cr.isCorrect ? '+1 Song' : 'No points'}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
