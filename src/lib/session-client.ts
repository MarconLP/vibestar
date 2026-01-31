import type { AnonymousSession } from './session'

const COOKIE_NAME = 'vibestar_session'

// Get session from cookies on the client
export function getClientSession(): AnonymousSession | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        acc[key] = decodeURIComponent(value)
      }
      return acc
    },
    {} as Record<string, string>
  )

  const sessionCookie = cookies[COOKIE_NAME]
  if (!sessionCookie) {
    return null
  }

  try {
    return JSON.parse(sessionCookie) as AnonymousSession
  } catch {
    return null
  }
}
