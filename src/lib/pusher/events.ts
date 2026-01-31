// Room Events (presence-room-{code})
export interface RoomSettingsUpdatedEvent {
  clipDuration: number
  maxPlayers: number
}

export interface RoomGameStartingEvent {
  countdownSeconds: number
}

export interface RoomGameStartedEvent {
  gameId: string
}

export interface RoomClosedEvent {
  reason: string
}

export interface RoomPlayerJoinedEvent {
  player: {
    id: string
    displayName: string
    avatarUrl?: string
  }
}

export interface RoomPlayerLeftEvent {
  playerId: string
}

// Game Events (private-game-{gameId})
export interface GameRoundStartEvent {
  roundId: string
  roundNumber: number
  currentPlayerId: string
  clipStartTime: number
  clipEndTime: number
  videoId: string
}

export interface GameRoundPhaseEvent {
  phase: 'PLAYING_CLIP' | 'GUESSING' | 'PLACING' | 'REVEALING'
}

export interface GameRoundResultEvent {
  playerId: string
  songNameGuess: string | null
  songNameCorrect: boolean
  placementCorrect: boolean
  pointsEarned: number
  actualSong: {
    name: string
    artist: string
    releaseYear: number
  }
}

export interface GameRoundEndEvent {
  roundNumber: number
  scores: Array<{ playerId: string; score: number }>
}

export interface GameTurnChangeEvent {
  currentPlayerId: string
  roundNumber: number
}

export interface GameEndedEvent {
  winner: {
    playerId: string
    displayName: string
    score: number
  }
  finalScores: Array<{
    playerId: string
    displayName: string
    score: number
  }>
}

// Player-specific Events (private-player-{playerId})
export interface PlayerYourTurnEvent {
  roundNumber: number
}

export interface PlayerTimelineUpdatedEvent {
  timeline: Array<{
    id: string
    songId: string
    position: number
    song: {
      name: string
      artist: string
      releaseYear: number
      thumbnailUrl?: string
    }
  }>
}
