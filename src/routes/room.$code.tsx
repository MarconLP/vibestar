import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Copy, Check, Users, Play, Music, Loader2, LogOut } from 'lucide-react'
import { getRoomByCode, leaveRoom } from '@/server/functions/room'
import { startGame } from '@/server/functions/game'
import { getPlaylists, importPlaylist } from '@/server/functions/playlist'
import { usePresenceChannel, useChannel } from '@/hooks/usePusher'
import { getClientSession } from '@/lib/session-client'
import type {
  RoomPlayerJoinedEvent,
  RoomPlayerLeftEvent,
  RoomGameStartedEvent,
} from '@/lib/pusher/events'

export const Route = createFileRoute('/room/$code')({
  component: RoomLobby,
  loader: async ({ params }) => {
    const room = await getRoomByCode({ data: { code: params.code } })

    if (!room) {
      throw redirect({ to: '/' })
    }

    if (room.game) {
      throw redirect({ to: '/play/$gameId', params: { gameId: room.game.id } })
    }

    const playlists = await getPlaylists()
    return { room, playlists }
  },
})

function RoomLobby() {
  const navigate = useNavigate()
  const { room: initialRoom, playlists: initialPlaylists } = Route.useLoaderData()
  const [room, setRoom] = useState(initialRoom)
  const [playlists, setPlaylists] = useState(initialPlaylists)
  const [copied, setCopied] = useState(false)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Subscribe to room presence
  const { myId } = usePresenceChannel(`presence-room-${room.code}`)
  const { bind, unbind } = useChannel(`presence-room-${room.code}`)

  useEffect(() => {
    bind<RoomPlayerJoinedEvent>('room:player-joined', (data) => {
      setRoom((prev) => ({
        ...prev,
        players: [...prev.players, { ...data.player, isHost: false, score: 0, joinedAt: new Date(), roomId: prev.id, userId: '', avatarUrl: data.player.avatarUrl ?? null }],
      }))
    })

    bind<RoomPlayerLeftEvent>('room:player-left', (data) => {
      setRoom((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== data.playerId),
      }))
    })

    bind<RoomGameStartedEvent>('room:game-started', (data) => {
      navigate({ to: '/play/$gameId', params: { gameId: data.gameId } })
    })

    return () => {
      unbind('room:player-joined')
      unbind('room:player-left')
      unbind('room:game-started')
    }
  }, [bind, unbind, navigate])

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return

    setIsImporting(true)
    setError(null)

    try {
      const playlist = await importPlaylist({ data: { playlistUrl } })
      setPlaylists((prev) => [{ ...playlist, _count: { songs: playlist.songs?.length ?? 0 } }, ...prev])
      setSelectedPlaylistId(playlist.id)
      setPlaylistUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import playlist')
    } finally {
      setIsImporting(false)
    }
  }

  const handleStartGame = async () => {
    if (!selectedPlaylistId) return

    setIsStarting(true)
    setError(null)

    try {
      await startGame({
        data: {
          roomId: room.id,
          playlistId: selectedPlaylistId,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
      setIsStarting(false)
    }
  }

  const handleLeave = async () => {
    try {
      await leaveRoom({ data: { roomId: room.id } })
      navigate({ to: '/' })
    } catch (err) {
      console.error('Failed to leave room:', err)
    }
  }

  // Use presence channel ID or fall back to client session
  const clientSession = getClientSession()
  const currentUserId = myId || clientSession?.id
  const isHost = room.players.find((p) => p.isHost)?.userId === currentUserId
  const canStart = isHost && selectedPlaylistId && room.players.length >= 1

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: 'linear-gradient(135deg, #0c1a2b 0%, #1a2332 50%, #16202e 100%)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Room Code</p>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
            >
              <span className="text-2xl font-mono font-bold text-white tracking-widest">
                {room.code}
              </span>
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Players */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">
                Players ({room.players.length}/{room.maxPlayers})
              </h2>
            </div>

            <div className="space-y-3">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {player.displayName[0]?.toUpperCase()}
                  </div>
                  <p className="text-white font-medium">
                    {player.displayName}
                    {player.isHost && (
                      <span className="ml-2 text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                        Host
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Playlist Selection */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(22, 32, 46, 0.95) 0%, rgba(12, 26, 43, 0.95) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Playlist</h2>
            </div>

            {isHost && (
              <form onSubmit={handleImportPlaylist} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="YouTube playlist URL..."
                    className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: 'white',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isImporting || !playlistUrl.trim()}
                    className="px-4 py-2 rounded-lg font-medium bg-purple-500 text-white disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => isHost && setSelectedPlaylistId(playlist.id)}
                  disabled={!isHost}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    selectedPlaylistId === playlist.id
                      ? 'bg-purple-500/30 border border-purple-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  } ${!isHost ? 'cursor-default' : ''}`}
                >
                  {playlist.thumbnailUrl && (
                    <img
                      src={playlist.thumbnailUrl}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{playlist.name}</p>
                    <p className="text-sm text-gray-500">
                      {playlist._count?.songs || 0} songs
                    </p>
                  </div>
                </button>
              ))}

              {playlists.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                  {isHost
                    ? 'Import a YouTube playlist to get started'
                    : 'Waiting for host to select a playlist'}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Start Button */}
        {isHost && (
          <div className="mt-6">
            <button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: canStart
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)'
                  : 'rgba(139, 92, 246, 0.2)',
                color: 'white',
              }}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Game
                </>
              )}
            </button>
            {!selectedPlaylistId && (
              <p className="mt-2 text-center text-sm text-gray-500">
                Select a playlist to continue
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
