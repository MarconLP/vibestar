export interface YouTubePlaylistItem {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

export interface YouTubeVideoDetails {
  videoId: string
  title: string
  channelTitle: string
  duration: number // in seconds
  thumbnailUrl: string
  publishedAt: string
}

export interface ParsedSongData {
  videoId: string
  name: string
  artist: string
  releaseYear: number
  duration: number
  thumbnailUrl: string
}

export interface PlaylistImportResult {
  playlistId: string
  name: string
  thumbnailUrl: string
  songs: ParsedSongData[]
}
