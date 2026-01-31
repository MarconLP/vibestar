import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { joinRoom } from '@/server/functions/room'

export const Route = createFileRoute('/join')({
  component: JoinGame,
})

function JoinGame() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setIsJoining(true)
    setError(null)

    try {
      const result = await joinRoom({ data: { code: code.toUpperCase() } })
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
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Join Game</h1>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="ABCD12"
                className="w-full px-4 py-3 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  color: 'white',
                }}
                maxLength={6}
                autoComplete="off"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500 text-center">
                Enter the 6-character room code
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || code.length !== 6}
              className="w-full py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                color: 'white',
              }}
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
  )
}
