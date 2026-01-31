import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Play, Pause } from 'lucide-react'

interface YouTubePlayerProps {
  videoId: string
  startTime: number
  endTime: number
  onClipEnd: () => void
  isMyTurn: boolean
}

export function YouTubePlayer({
  videoId,
  startTime,
  endTime,
  onClipEnd,
  isMyTurn,
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const startTimeRef = useRef<number>()

  const clipDuration = endTime - startTime

  useEffect(() => {
    // Auto-play when component mounts
    setIsPlaying(true)
    startTimeRef.current = Date.now()

    // Track progress
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const newProgress = Math.min((elapsed / clipDuration) * 100, 100)
        setProgress(newProgress)

        if (elapsed >= clipDuration) {
          setIsPlaying(false)
          clearInterval(intervalRef.current)
          onClipEnd()
        }
      }
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [clipDuration, onClipEnd])

  // YouTube embed URL with autoplay and time restrictions
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startTime}&end=${endTime}&autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&mute=${isMuted ? 1 : 0}`

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
      }}
    >
      <h2 className="text-xl font-bold text-white mb-4">
        {isMyTurn ? 'Listen to the clip' : 'Listening...'}
      </h2>

      {/* Video container - small preview */}
      <div className="relative w-full max-w-xs mx-auto mb-6">
        <div className="aspect-video rounded-lg overflow-hidden bg-black/50">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Overlay to prevent seeking */}
        <div className="absolute inset-0 bg-transparent" />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>{Math.floor((progress / 100) * clipDuration)}s</span>
          <span>{clipDuration}s</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>

        <div
          className={`p-4 rounded-full ${
            isPlaying
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse'
              : 'bg-white/20'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </div>

        <div className="w-11" /> {/* Spacer for centering */}
      </div>

      {isMyTurn && (
        <p className="mt-4 text-center text-gray-400 text-sm">
          Listen carefully and get ready to guess!
        </p>
      )}
    </div>
  )
}
