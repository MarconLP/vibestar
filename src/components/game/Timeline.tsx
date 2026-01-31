import { Music, Plus } from 'lucide-react'

interface TimelineEntry {
  id: string
  position: number
  song: {
    id: string
    name: string
    artist: string
    releaseYear: number
    thumbnailUrl: string | null
  }
}

interface TimelineProps {
  entries: TimelineEntry[]
  placingMode?: boolean
  onPlacement?: (position: number) => void
}

export function Timeline({ entries, placingMode = false, onPlacement }: TimelineProps) {
  const sortedEntries = [...entries].sort((a, b) => a.position - b.position)

  if (entries.length === 0 && !placingMode) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No songs on your timeline yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-pink-500/50 to-purple-500/50" />

      <div className="space-y-2">
        {/* Drop zone at the beginning */}
        {placingMode && (
          <DropZone position={0} onDrop={onPlacement} label="Before all" />
        )}

        {sortedEntries.map((entry, index) => (
          <div key={entry.id}>
            <TimelineCard entry={entry} />

            {/* Drop zone after each entry */}
            {placingMode && (
              <DropZone
                position={index + 1}
                onDrop={onPlacement}
                label={index === sortedEntries.length - 1 ? 'After all' : undefined}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 ring-4 ring-purple-500/20" />

      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
        {entry.song.thumbnailUrl ? (
          <img
            src={entry.song.thumbnailUrl}
            alt=""
            className="w-12 h-12 rounded object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-purple-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{entry.song.name}</p>
          <p className="text-sm text-gray-500 truncate">{entry.song.artist}</p>
        </div>

        <div className="text-right">
          <span className="text-lg font-bold text-purple-400">
            {entry.song.releaseYear}
          </span>
        </div>
      </div>
    </div>
  )
}

function DropZone({
  position,
  onDrop,
  label,
}: {
  position: number
  onDrop?: (position: number) => void
  label?: string
}) {
  return (
    <button
      onClick={() => onDrop?.(position)}
      className="relative w-full pl-10 py-2 group"
    >
      {/* Connector dot */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-500/50 group-hover:bg-purple-400 transition-colors" />

      <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 transition-all cursor-pointer">
        <Plus className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-purple-400">
          {label || 'Place here'}
        </span>
      </div>
    </button>
  )
}
