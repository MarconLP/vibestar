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
    <div
      className="p-6 rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
      }}
    >
      <h2 className="text-xl font-bold text-white mb-6 text-center">
        {isMyTurn ? 'Your Result' : 'Round Result'}
      </h2>

      {/* Song Reveal */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{actualSong.name}</p>
            <p className="text-gray-400">{actualSong.artist}</p>
            <p className="text-sm text-purple-400 font-medium">
              Released: {actualSong.releaseYear}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4 mb-6">
        {/* Song Name Result */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div>
            <p className="text-gray-400 text-sm">Song Name</p>
            <p className="text-white">
              {songNameGuess || <span className="text-gray-500 italic">No guess</span>}
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
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div>
            <p className="text-gray-400 text-sm">Timeline Placement</p>
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
        <p className="text-gray-400 mb-1">Points Earned</p>
        <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
          +{pointsEarned}
        </p>
      </div>

      {/* Continue Button - only for the player whose turn it was */}
      {isMyTurn ? (
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
            color: 'white',
          }}
        >
          Continue
        </button>
      ) : (
        <p className="text-center text-gray-400">
          Waiting for player to continue...
        </p>
      )}
    </div>
  )
}
