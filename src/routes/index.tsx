import { createFileRoute, Link } from '@tanstack/react-router'
import { Music, Users, Play } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: GameLanding,
})

function GameLanding() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0c1a2b 0%, #1a2332 50%, #16202e 100%)',
      }}
    >
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Music className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Vibestar</h1>
          <p className="text-lg text-gray-400">
            Guess the song, build your timeline
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/create"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              color: 'white',
            }}
          >
            <Play className="w-5 h-5" />
            Create Game
          </Link>

          <Link
            to="/join"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border"
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              color: 'white',
            }}
          >
            <Users className="w-5 h-5" />
            Join Game
          </Link>
        </div>

        <div
          className="mt-12 p-6 rounded-xl border"
          style={{
            background: 'rgba(139, 92, 246, 0.05)',
            borderColor: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">How to Play</h2>
          <div className="text-left space-y-3 text-gray-400">
            <div className="flex gap-3">
              <span className="text-purple-400 font-bold">1.</span>
              <span>Create or join a game room with friends</span>
            </div>
            <div className="flex gap-3">
              <span className="text-purple-400 font-bold">2.</span>
              <span>Import a YouTube Music playlist with songs</span>
            </div>
            <div className="flex gap-3">
              <span className="text-purple-400 font-bold">3.</span>
              <span>Each round, listen to a clip and guess the song</span>
            </div>
            <div className="flex gap-3">
              <span className="text-purple-400 font-bold">4.</span>
              <span>Place the song on your timeline by release year</span>
            </div>
            <div className="flex gap-3">
              <span className="text-purple-400 font-bold">5.</span>
              <span>Score points for correct guesses and placements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
