import type { YouTubeVideoDetails, ParsedSongData } from './types'

// Extract playlist ID from various YouTube URL formats
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    /music\.youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

// Parse ISO 8601 duration (PT3M45S) to seconds
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

// Parse song title to extract artist and song name
// Common formats:
// - "Artist - Song Name"
// - "Artist - Song Name (Official Video)"
// - "Song Name by Artist"
export function parseSongTitle(title: string, channelTitle: string): { artist: string; name: string } {
  // Clean up common suffixes
  const cleanTitle = title
    .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, '')
    .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, '')
    .replace(/\s*\(Official\s*Audio\)/gi, '')
    .replace(/\s*\[Official\s*Audio\]/gi, '')
    .replace(/\s*\(Lyrics?\)/gi, '')
    .replace(/\s*\[Lyrics?\]/gi, '')
    .replace(/\s*\(HD\)/gi, '')
    .replace(/\s*\(HQ\)/gi, '')
    .replace(/\s*\(4K\)/gi, '')
    .replace(/\s*ft\.?\s+.+$/gi, '')
    .replace(/\s*feat\.?\s+.+$/gi, '')
    .trim()

  // Try "Artist - Song" format
  const dashMatch = cleanTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      name: dashMatch[2].trim(),
    }
  }

  // Try "Song by Artist" format
  const byMatch = cleanTitle.match(/^(.+?)\s+by\s+(.+)$/i)
  if (byMatch) {
    return {
      artist: byMatch[2].trim(),
      name: byMatch[1].trim(),
    }
  }

  // Fallback: use channel name as artist
  return {
    artist: channelTitle.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim(),
    name: cleanTitle,
  }
}

// Estimate release year from published date
export function estimateReleaseYear(publishedAt: string): number {
  const date = new Date(publishedAt)
  return date.getFullYear()
}

// Convert YouTube video details to parsed song data
export function parseVideoToSong(video: YouTubeVideoDetails): ParsedSongData {
  const { artist, name } = parseSongTitle(video.title, video.channelTitle)

  return {
    videoId: video.videoId,
    name,
    artist,
    releaseYear: estimateReleaseYear(video.publishedAt),
    duration: video.duration,
    thumbnailUrl: video.thumbnailUrl,
  }
}
