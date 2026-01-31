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
    <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-2">What song is this?</h2>
      <p className="text-neutral-400 mb-4">
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
            className="w-full px-4 py-3 pr-12 rounded-xl text-lg bg-neutral-800 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={!guess.trim() || disabled || isSubmitting}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 text-black animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-black" />
            )}
          </button>
        </div>

        <p className="text-sm text-neutral-500 text-center">
          Don't worry about exact spelling - we'll use fuzzy matching!
        </p>
      </form>
    </div>
  )
}
