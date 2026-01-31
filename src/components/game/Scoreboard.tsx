import { Trophy, Coins } from 'lucide-react'

interface Player {
  id: string
  displayName: string
  score: number
  tokens?: number
  avatarUrl?: string | null
}

interface ScoreboardProps {
  players: Player[]
  currentPlayerId: string | null
  myTokens?: number
  myPlayerId?: string
}

export function Scoreboard({ players, currentPlayerId, myTokens, myPlayerId }: ScoreboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="flex items-center gap-3">
      {sortedPlayers.map((player, index) => {
        // Use myTokens for the current user if provided
        const tokens = player.id === myPlayerId ? myTokens : player.tokens

        return (
          <div
            key={player.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
              player.id === currentPlayerId
                ? 'bg-green-500/20 ring-2 ring-green-400'
                : 'bg-neutral-800/50 border border-white/5'
            }`}
          >
            {index === 0 && sortedPlayers.length > 1 && player.score > 0 && (
              <Trophy className="w-4 h-4 text-yellow-400" />
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-black text-sm font-bold">
              {player.displayName[0]?.toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm text-white font-medium">{player.displayName}</p>
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-green-400 font-bold">{player.score} songs</span>
                <span className={`flex items-center gap-0.5 text-xs font-bold ${(tokens ?? 0) > 0 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                  <Coins className="w-3 h-3" />
                  {tokens ?? 0}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
