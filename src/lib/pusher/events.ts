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
  phase: 'PLAYING_CLIP' | 'PLACING' | 'CONTESTING' | 'REVEALING'
}

export interface GameRoundResultEvent {
  playerId: string
  songNameGuess: string | null
  songNameCorrect: boolean
  placementCorrect: boolean
  placementPosition: number // The position where the player placed the song
  timelineCount: number
  canBeContested: boolean
  tokenEarned: boolean // True if player earned a token from correct song guess
  playerTokens: number // The player's current token count (for syncing across clients)
  actualSong: {
    name: string
    artist: string
    releaseYear: number
  }
  contestResults?: Array<{
    playerId: string
    playerName: string
    isOriginal: boolean
    position: number | null
    isCorrect: boolean
  }>
  // The current player's timeline (for displaying on the result screen)
  currentPlayerTimeline?: Array<{
    id: string
    position: number
    song: {
      name: string
      artist: string
      releaseYear: number
    }
  }>
}

export interface GameContestSubmittedEvent {
  contesterId: string
  contesterName: string
  position: number
  newTokenCount: number
}

export interface GameContestWindowEvent {
  roundId: string
  currentPlayerId: string
  currentPlayerTimeline: Array<{
    id: string
    position: number
    song: {
      name: string
      artist: string
      releaseYear: number
    }
  }>
  placementPosition: number // Where the current player placed the song
  contestDeadline: number // Timestamp when contest window closes
}

export interface GameContestResultEvent {
  contesterId: string
  contesterName: string
  success: boolean
  newTimelineCount: number
  newTokenCount: number // Contester's token count after spending 1
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
