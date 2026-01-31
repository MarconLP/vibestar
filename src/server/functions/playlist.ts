import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/start-server-core'
import { prisma } from '@/db'
import { auth } from '@/lib/auth'
import { importPlaylistFromUrl } from '@/lib/youtube/api'
import { extractPlaylistId } from '@/lib/youtube/parser'

// Get the current user's session
async function getSession() {
  const request = getRequest()
  return await auth.api.getSession({ headers: request.headers })
}

// Import a playlist from YouTube
export const importPlaylist = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { playlistUrl: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const playlistId = extractPlaylistId(data.playlistUrl)
    if (!playlistId) {
      throw new Error('Invalid playlist URL')
    }

    // Check if playlist already exists
    const existing = await prisma.playlist.findUnique({
      where: { youtubeId: playlistId },
      include: { songs: true },
    })

    if (existing) {
      return existing
    }

    // Import from YouTube
    const result = await importPlaylistFromUrl(data.playlistUrl)

    // Save to database
    const playlist = await prisma.playlist.create({
      data: {
        youtubeId: result.playlistId,
        name: result.name,
        thumbnailUrl: result.thumbnailUrl,
        songs: {
          create: result.songs.map((song) => ({
            youtubeVideoId: song.videoId,
            name: song.name,
            artist: song.artist,
            releaseYear: song.releaseYear,
            duration: song.duration,
            thumbnailUrl: song.thumbnailUrl,
          })),
        },
      },
      include: { songs: true },
    })

    return playlist
  })

// Get a playlist by ID
export const getPlaylist = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { playlistId: string }) => data)
  .handler(async ({ data }) => {
    const playlist = await prisma.playlist.findUnique({
      where: { id: data.playlistId },
      include: {
        songs: {
          orderBy: { releaseYear: 'asc' },
        },
      },
    })

    return playlist
  })

// Get all playlists
export const getPlaylists = createServerFn({
  method: 'GET',
}).handler(async () => {
  const playlists = await prisma.playlist.findMany({
    include: {
      _count: {
        select: { songs: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return playlists
})

// Update a song's metadata (for manual corrections)
export const updateSong = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: { songId: string; name?: string; artist?: string; releaseYear?: number }) => data
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const song = await prisma.song.update({
      where: { id: data.songId },
      data: {
        name: data.name,
        artist: data.artist,
        releaseYear: data.releaseYear,
      },
    })

    return song
  })
