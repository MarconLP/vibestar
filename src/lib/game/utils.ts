// Generate a random 6-character room code
// Uses characters that are easy to read and type
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes I, O, 0, 1 for clarity
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Shuffle an array using Fisher-Yates algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Check if a timeline placement is correct
export function checkPlacementCorrect(
  timeline: Array<{ song: { releaseYear: number } }>,
  insertPosition: number,
  newYear: number
): boolean {
  const beforeSong = timeline[insertPosition - 1]
  const afterSong = timeline[insertPosition]

  const beforeOk = !beforeSong || beforeSong.song.releaseYear <= newYear
  const afterOk = !afterSong || afterSong.song.releaseYear >= newYear

  return beforeOk && afterOk
}

// Calculate points for a round
export function calculatePoints(songNameCorrect: boolean, placementCorrect: boolean): number {
  let points = 0
  if (songNameCorrect) points += 10
  if (placementCorrect) points += 15
  return points
}
