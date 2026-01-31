import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Loader2, Settings, User } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { createRoom } from '@/server/functions/room'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/create')({
  component: CreateGame,
})

function CreateGame() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clipDuration, setClipDuration] = useState(15)

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Check if already signed in
      const session = await authClient.getSession()

      if (!session.data) {
        // Sign in anonymously if not already signed in
        const { error: signInError } = await authClient.signIn.anonymous()

        if (signInError) {
          throw new Error(signInError.message)
        }
      }

      // Update the user's name
      await authClient.updateUser({ name: displayName.trim() })

      // Create the room
      const room = await createRoom({
        data: { clipDuration },
      })
      navigate({ to: '/room/$code', params: { code: room.code } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-800/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center border border-white/5">
                <Settings className="w-5 h-5 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">Create Game</h1>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Your Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  maxLength={20}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Clip Duration (seconds)
                </label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={clipDuration}
                  onChange={(e) => setClipDuration(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-sm text-neutral-500 mt-1">
                  <span>10s</span>
                  <span className="text-green-400 font-medium">{clipDuration}s</span>
                  <span>30s</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={isCreating || !displayName.trim()}
                className="w-full py-3 px-4 rounded-xl font-semibold text-lg bg-green-500 text-black transition-all duration-200 hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </div>
  )
}
