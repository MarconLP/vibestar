import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Loader2, Settings } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { createRoom } from '@/server/functions/room'

export const Route = createFileRoute('/create')({
  component: CreateGame,
})

function CreateGame() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clipDuration, setClipDuration] = useState(15)
  const [maxPlayers, setMaxPlayers] = useState(4)

  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const room = await createRoom({
        data: { clipDuration, maxPlayers },
      })
      navigate({ to: '/room/$code', params: { code: room.code } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
      setIsCreating(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0c1a2b 0%, #1a2332 50%, #16202e 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div
          className="p-6 rounded-xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
            borderColor: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create Game</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Clip Duration (seconds)
              </label>
              <input
                type="range"
                min="10"
                max="30"
                value={clipDuration}
                onChange={(e) => setClipDuration(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>10s</span>
                <span className="text-purple-400 font-medium">{clipDuration}s</span>
                <span>30s</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Players
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setMaxPlayers(num)}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                      maxPlayers === num
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                color: 'white',
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
