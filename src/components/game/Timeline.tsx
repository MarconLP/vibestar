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

interface ContestVote {
  contesterName: string
  position: number
}

interface TimelineProps {
  entries: TimelineEntry[]
  placingMode?: boolean
  onPlacement?: (position: number) => void
  blockedPosition?: number // Position that cannot be selected (used when contesting a correct placement)
  guessPosition?: number // Position where a player placed their guess (shows a marker)
  contestVotes?: ContestVote[] // Contest votes from other players
}

export function Timeline({ entries, placingMode = false, onPlacement, blockedPosition, guessPosition, contestVotes = [] }: TimelineProps) {
  const sortedEntries = [...entries].sort((a, b) => a.position - b.position)

  // Get contest votes for a specific position
  const getContestVotesForPosition = (position: number) =>
    contestVotes.filter(v => v.position === position)

  if (entries.length === 0 && !placingMode) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No songs on your timeline yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500/50 via-emerald-500/50 to-green-500/50" />

      <div className="space-y-2">
        {/* Guess marker or drop zone at the beginning */}
        {guessPosition === 0 && <GuessMarker />}
        {getContestVotesForPosition(0).map((vote, i) => (
          <ContestMarker key={`contest-0-${i}`} contesterName={vote.contesterName} />
        ))}
        {placingMode && (
          <DropZone position={0} onDrop={onPlacement} label="Before all" blocked={blockedPosition === 0} />
        )}

        {sortedEntries.map((entry, index) => (
          <div key={entry.id}>
            <TimelineCard entry={entry} />

            {/* Guess marker or drop zone after each entry */}
            {guessPosition === index + 1 && <GuessMarker />}
            {getContestVotesForPosition(index + 1).map((vote, i) => (
              <ContestMarker key={`contest-${index + 1}-${i}`} contesterName={vote.contesterName} />
            ))}
            {placingMode && (
              <DropZone
                position={index + 1}
                onDrop={onPlacement}
                label={index === sortedEntries.length - 1 ? 'After all' : undefined}
                blocked={blockedPosition === index + 1}
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
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-500/20" />

      <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 border border-white/5 hover:border-white/10 transition-colors">
        {entry.song.thumbnailUrl ? (
          <img
            src={entry.song.thumbnailUrl}
            alt=""
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Music className="w-5 h-5 text-green-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{entry.song.name}</p>
          <p className="text-sm text-neutral-500 truncate">{entry.song.artist}</p>
        </div>

        <div className="text-right">
          <span className="text-lg font-bold text-green-400">
            {entry.song.releaseYear}
          </span>
        </div>
      </div>
    </div>
  )
}

function GuessMarker() {
  return (
    <div className="relative w-full pl-10 py-1">
      {/* Connector dot */}
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-500 ring-4 ring-yellow-500/20 animate-pulse" />

      <div className="flex items-center justify-center gap-2 p-2 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10">
        <span className="text-sm font-medium text-yellow-400">Their guess</span>
      </div>
    </div>
  )
}

function ContestMarker({ contesterName }: { contesterName: string }) {
  return (
    <div className="relative w-full pl-10 py-1">
      {/* Connector dot */}
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-500/20 animate-pulse" />

      <div className="flex items-center justify-center gap-2 p-2 rounded-xl border-2 border-purple-500/50 bg-purple-500/10">
        <span className="text-sm font-medium text-purple-400">{contesterName}'s contest</span>
      </div>
    </div>
  )
}

function DropZone({
  position,
  onDrop,
  label,
  blocked = false,
}: {
  position: number
  onDrop?: (position: number) => void
  label?: string
  blocked?: boolean
}) {
  if (blocked) {
    return (
      <div className="relative w-full pl-10 py-2">
        {/* Connector dot */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neutral-600" />

        <div className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-800/30 cursor-not-allowed">
          <span className="text-sm text-neutral-500">Already placed here</span>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => onDrop?.(position)}
      className="relative w-full pl-10 py-2 group"
    >
      {/* Connector dot */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500/50 group-hover:bg-green-400 transition-colors" />

      <div className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-green-500/30 hover:border-green-400 hover:bg-green-500/10 transition-all cursor-pointer">
        <Plus className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400">
          {label || 'Place here'}
        </span>
      </div>
    </button>
  )
}
