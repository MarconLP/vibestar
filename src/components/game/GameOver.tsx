import { Link } from '@tanstack/react-router'
import { Trophy, Medal, Crown, Home } from 'lucide-react'
import type { GameEndedEvent } from '@/lib/pusher/events'

interface GameOverProps {
  result: GameEndedEvent
}

export function GameOver({ result }: GameOverProps) {
  const { winner, finalScores } = result

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-800/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Winner */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 animate-pulse">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
            <p className="text-xl text-green-400">
              <span className="font-bold">{winner.displayName}</span> wins!
            </p>
          </div>

          {/* Leaderboard */}
          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Final Scores
            </h2>

            <div className="space-y-3">
              {finalScores.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30'
                      : index === 2
                      ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30'
                      : 'bg-neutral-800/50 border border-white/5'
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
                          : 'bg-neutral-800 text-neutral-400'
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
                        index === 0 ? 'text-yellow-400' : 'text-green-400'
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
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold bg-green-500 text-black transition-all duration-200 hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
