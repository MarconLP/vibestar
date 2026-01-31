import { Link } from '@tanstack/react-router'
import { Trophy, Medal, Crown, Home } from 'lucide-react'
import type { GameEndedEvent } from '@/lib/pusher/events'

interface GameOverProps {
  result: GameEndedEvent
}

export function GameOver({ result }: GameOverProps) {
  const { winner, finalScores } = result

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0c1a2b 0%, #1a2332 50%, #16202e 100%)',
      }}
    >
      <div className="w-full max-w-md text-center">
        {/* Winner */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 animate-pulse">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
          <p className="text-xl text-purple-400">
            <span className="font-bold">{winner.displayName}</span> wins!
          </p>
        </div>

        {/* Leaderboard */}
        <div
          className="p-6 rounded-xl border mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
            borderColor: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Final Scores
          </h2>

          <div className="space-y-3">
            {finalScores.map((player, index) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-gray-400 text-white'
                        : index === 2
                        ? 'bg-orange-600 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-white font-medium">{player.displayName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {index === 0 && <Medal className="w-5 h-5 text-yellow-400" />}
                  <span
                    className={`font-bold ${
                      index === 0 ? 'text-yellow-400' : 'text-purple-400'
                    }`}
                  >
                    {player.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              color: 'white',
            }}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
