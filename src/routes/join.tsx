import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Loader2, Globe, User } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { joinRoom } from '@/server/functions/room'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/join')({
  component: JoinGame,
})

function JoinGame() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !displayName.trim()) return

    setIsJoining(true)
    setError(null)

    try {
      // Sign in anonymously
      const { error: signInError } = await authClient.signIn.anonymous()

      if (signInError) {
        throw new Error(signInError.message)
      }

      // Update the user's name after signing in
      await authClient.updateUser({ name: displayName.trim() })

      // Join the room
      const result = await joinRoom({
        data: { code: code.toUpperCase() },
      })
      if (result.room) {
        navigate({ to: '/room/$code', params: { code: result.room.code } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
      setIsJoining(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(value)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />
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
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">Join Game</h1>
            </div>

            <form onSubmit={handleJoin} className="space-y-6">
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
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  maxLength={20}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="ABCD12"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 text-white text-center text-2xl font-mono tracking-widest placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  maxLength={6}
                  autoComplete="off"
                />
                <p className="mt-2 text-sm text-neutral-500 text-center">
                  Enter the 6-character room code
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining || code.length !== 6 || !displayName.trim()}
                className="w-full py-3 px-4 rounded-xl font-semibold text-lg bg-blue-500 text-white transition-all duration-200 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
