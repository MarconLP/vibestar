import type { YouTubePlaylistItem, YouTubeVideoDetails, PlaylistImportResult } from './types'
import { parseDuration, parseVideoToSong, extractPlaylistId } from './parser'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) {
    throw new Error('YOUTUBE_API_KEY environment variable not set')
  }
  return key
}

interface PlaylistItemsResponse {
  items: Array<{
    snippet: {
      resourceId: { videoId: string }
      title: string
      thumbnails: { medium?: { url: string }; default?: { url: string } }
      videoOwnerChannelTitle: string
    }
  }>
  nextPageToken?: string
}

interface PlaylistResponse {
  items: Array<{
    snippet: {
      title: string
      thumbnails: { medium?: { url: string }; default?: { url: string } }
    }
  }>
}

interface VideosResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      channelTitle: string
      thumbnails: { medium?: { url: string }; default?: { url: string } }
      publishedAt: string
    }
    contentDetails: {
      duration: string
    }
  }>
}

// Fetch playlist metadata
async function fetchPlaylistInfo(playlistId: string): Promise<{ title: string; thumbnailUrl: string }> {
  const apiKey = getApiKey()
  const url = `${YOUTUBE_API_BASE}/playlists?part=snippet&id=${playlistId}&key=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist info: ${response.statusText}`)
  }

  const data = (await response.json()) as PlaylistResponse
  if (!data.items?.length) {
    throw new Error('Playlist not found')
  }

  const playlist = data.items[0]
  return {
    title: playlist.snippet.title,
    thumbnailUrl: playlist.snippet.thumbnails.medium?.url || playlist.snippet.thumbnails.default?.url || '',
  }
}

// Fetch all items from a playlist (handles pagination)
async function fetchPlaylistItems(playlistId: string, maxItems = 50): Promise<YouTubePlaylistItem[]> {
  const apiKey = getApiKey()
  const items: YouTubePlaylistItem[] = []
  let pageToken: string | undefined

  while (items.length < maxItems) {
    const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('playlistId', playlistId)
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('key', apiKey)
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist items: ${response.statusText}`)
    }

    const data = (await response.json()) as PlaylistItemsResponse

    for (const item of data.items) {
      if (items.length >= maxItems) break
      items.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
        channelTitle: item.snippet.videoOwnerChannelTitle || '',
      })
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return items
}

// Fetch video details for multiple videos (max 50 per request)
async function fetchVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
  const apiKey = getApiKey()
  const details: YouTubeVideoDetails[] = []

  // Process in batches of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const url = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${apiKey}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch video details: ${response.statusText}`)
    }

    const data = (await response.json()) as VideosResponse

    for (const item of data.items) {
      details.push({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        duration: parseDuration(item.contentDetails.duration),
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
        publishedAt: item.snippet.publishedAt,
      })
    }
  }

  return details
}

// Main function to import a playlist
export async function importPlaylistFromUrl(playlistUrl: string): Promise<PlaylistImportResult> {
  const playlistId = extractPlaylistId(playlistUrl)
  if (!playlistId) {
    throw new Error('Invalid playlist URL')
  }

  // Fetch playlist info
  const playlistInfo = await fetchPlaylistInfo(playlistId)

  // Fetch playlist items
  const items = await fetchPlaylistItems(playlistId)

  // Fetch video details
  const videoIds = items.map((item) => item.videoId)
  const videoDetails = await fetchVideoDetails(videoIds)

  // Parse videos to songs
  const songs = videoDetails
    .filter((video) => video.duration > 30) // Filter out very short videos
    .map(parseVideoToSong)

  return {
    playlistId,
    name: playlistInfo.title,
    thumbnailUrl: playlistInfo.thumbnailUrl,
    songs,
  }
}

// Calculate a random clip start time that avoids intro/outro
export function calculateClipStart(songDuration: number, clipLength: number): number {
  // Avoid first 30 seconds (intro) and last 10 seconds (outro)
  const safeStart = 30
  const safeEnd = songDuration - clipLength - 10

  if (safeEnd <= safeStart) {
    // Song is too short, start from beginning
    return 0
  }

  return Math.floor(Math.random() * (safeEnd - safeStart)) + safeStart
}
