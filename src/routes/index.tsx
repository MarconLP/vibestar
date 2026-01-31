import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Users, ArrowRight, X, Link2, Trophy, Music2 } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: GameLanding,
})

function GameLanding() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-green-500 selection:text-black overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-800/30 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 md:px-8 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-black transform rotate-12">
            V
          </div>
          <span className="font-bold text-xl tracking-tight">Vibestar</span>
        </div>
        <div className="flex gap-6 text-sm font-medium text-neutral-400">
          <button
            onClick={() => setShowHowItWorks(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            About
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-12 pb-12 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-6">
          <span className="px-4 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-xs font-medium text-green-400 uppercase tracking-wider">
            The Ultimate Music Timeline Game
          </span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          TEST YOUR <br />
          <span className="text-white relative">
            KNOWLEDGE
            <svg
              className="absolute w-full h-3 -bottom-1 left-0 text-green-500"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path
                d="M0 5 Q 50 10 100 5"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
            </svg>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-lg text-neutral-400 mb-12 leading-relaxed">
          Select a mode to start your musical journey.
        </p>

        {/* Game Mode Cards */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-4xl justify-center items-stretch">
          {/* Create Room Card */}
          <Link
            to="/create"
            className="group flex-1 bg-neutral-900/50 hover:bg-neutral-800 border border-white/10 hover:border-green-500/50 rounded-3xl p-8 transition-all hover:scale-[1.02] text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors" />
            <div className="w-14 h-14 bg-neutral-800 rounded-2xl flex items-center justify-center mb-6 text-green-500 group-hover:scale-110 transition-transform shadow-lg border border-white/5">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-green-400 transition-colors">
              Create Room
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Host a new game and invite your friends to join with a room code.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-white group-hover:text-green-400 transition-colors mt-auto">
              Create Game{' '}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Join Room Card */}
          <Link
            to="/join"
            className="group flex-1 bg-neutral-900/50 hover:bg-neutral-800 border border-white/10 hover:border-blue-500/50 rounded-3xl p-8 transition-all hover:scale-[1.02] text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
            <div className="w-14 h-14 bg-neutral-800 rounded-2xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform shadow-lg border border-white/5">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
              Join Room
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Enter a room code to join an existing game with your friends.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-white group-hover:text-blue-400 transition-colors mt-auto">
              Join Game{' '}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* How it Works Modal */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="bg-neutral-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-white">How to Play</h2>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">1. Create or Join</h3>
                  <p className="text-sm text-neutral-400">
                    Create a room and share the code with friends, or join an existing game.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">2. Listen & Guess</h3>
                  <p className="text-sm text-neutral-400">
                    The active player listens to a clip and guesses where the song fits in their timeline.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">3. Place on Timeline</h3>
                  <p className="text-sm text-neutral-400">
                    Place the song in the correct position based on its release year to score points.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <Music2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">4. Win the Game</h3>
                  <p className="text-sm text-neutral-400">
                    First player to build a timeline of 10 correct songs wins the game.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-neutral-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-white">About Vibestar</h2>

            <div className="space-y-4 text-neutral-400">
              <p>
                Vibestar is a multiplayer music guessing game where you test your knowledge of songs and their release years.
              </p>
              <p>
                Import your favorite YouTube playlists and challenge your friends to see who knows their music history best.
              </p>
              <p>
                Built for music lovers who want to put their knowledge to the test in a fun, competitive way.
              </p>
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
