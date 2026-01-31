import { Check, X, Music } from 'lucide-react'
import type { GameRoundResultEvent } from '@/lib/pusher/events'

interface RoundResultProps {
  result: GameRoundResultEvent
  isMyTurn: boolean
  onContinue: () => void
}

export function RoundResult({ result, isMyTurn, onContinue }: RoundResultProps) {
  const { songNameCorrect, placementCorrect, pointsEarned, actualSong, songNameGuess } = result

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

      {/* Results */}
      <div className="space-y-4 mb-6">
        {/* Song Name Result */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50 border border-white/5">
          <div>
            <p className="text-neutral-400 text-sm">Song Name</p>
            <p className="text-white">
              {songNameGuess || <span className="text-neutral-500 italic">No guess</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {songNameCorrect ? (
              <>
                <span className="text-green-400 font-bold">+10</span>
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
              {placementCorrect ? 'Correct position!' : 'Wrong position'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {placementCorrect ? (
              <>
                <span className="text-green-400 font-bold">+15</span>
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
      </div>

      {/* Total Points */}
      <div className="text-center mb-6">
        <p className="text-neutral-400 mb-1">Points Earned</p>
        <p className="text-4xl font-bold text-green-400">
          +{pointsEarned}
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
