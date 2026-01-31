import { Trophy } from 'lucide-react'

interface Player {
  id: string
  displayName: string
  score: number
  avatarUrl?: string | null
}

interface ScoreboardProps {
  players: Player[]
  currentPlayerId: string | null
}

export function Scoreboard({ players, currentPlayerId }: ScoreboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="flex items-center gap-3">
      {sortedPlayers.map((player, index) => (
        <div
          key={player.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            player.id === currentPlayerId
              ? 'bg-purple-500/30 ring-2 ring-purple-400'
              : 'bg-white/5'
          }`}
        >
          {index === 0 && sortedPlayers.length > 1 && player.score > 0 && (
            <Trophy className="w-4 h-4 text-yellow-400" />
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
            {player.displayName[0]?.toUpperCase()}
          </div>
          <div className="text-right">
            <p className="text-sm text-white font-medium">{player.displayName}</p>
            <p className="text-xs text-purple-400 font-bold">{player.score} pts</p>
          </div>
        </div>
      ))}
    </div>
  )
}
