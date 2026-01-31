// Normalize a string for comparison
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Check if a guess matches the actual song name
// Uses fuzzy matching to handle typos and partial matches
export function fuzzyMatch(guess: string, actual: string): boolean {
  const normalizedGuess = normalize(guess)
  const normalizedActual = normalize(actual)

  // Exact match after normalization
  if (normalizedGuess === normalizedActual) {
    return true
  }

  // Empty guess is never correct
  if (!normalizedGuess) {
    return false
  }

  // Check if guess contains actual or vice versa
  if (normalizedActual.includes(normalizedGuess) || normalizedGuess.includes(normalizedActual)) {
    // Only accept if the guess is at least 60% of the actual length
    const minLength = Math.min(normalizedGuess.length, normalizedActual.length)
    const maxLength = Math.max(normalizedGuess.length, normalizedActual.length)
    if (minLength / maxLength >= 0.6) {
      return true
    }
  }

  // Levenshtein distance for typo tolerance
  const distance = levenshteinDistance(normalizedGuess, normalizedActual)
  const threshold = Math.floor(normalizedActual.length * 0.3) // Allow 30% errors

  return distance <= threshold
}

// Calculate a similarity score between 0 and 1
export function similarityScore(guess: string, actual: string): number {
  const normalizedGuess = normalize(guess)
  const normalizedActual = normalize(actual)

  if (!normalizedGuess || !normalizedActual) {
    return 0
  }

  if (normalizedGuess === normalizedActual) {
    return 1
  }

  const distance = levenshteinDistance(normalizedGuess, normalizedActual)
  const maxLength = Math.max(normalizedGuess.length, normalizedActual.length)

  return Math.max(0, 1 - distance / maxLength)
}
