import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface SongGuesserProps {
  onSubmit: (guess: string) => void
  disabled?: boolean
}

export function SongGuesser({ onSubmit, disabled }: SongGuesserProps) {
  const [guess, setGuess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guess.trim() || disabled) return

    setIsSubmitting(true)
    await onSubmit(guess.trim())
    setIsSubmitting(false)
  }

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
      }}
    >
      <h2 className="text-xl font-bold text-white mb-2">What song is this?</h2>
      <p className="text-gray-400 mb-4">
        Type the name of the song you think you heard
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Enter song name..."
            disabled={disabled || isSubmitting}
            className="w-full px-4 py-3 pr-12 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              color: 'white',
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!guess.trim() || disabled || isSubmitting}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center">
          Don't worry about exact spelling - we'll use fuzzy matching!
        </p>
      </form>
    </div>
  )
}
