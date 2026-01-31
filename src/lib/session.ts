import { getRequest } from '@tanstack/start-server-core'
import { randomBytes } from 'crypto'

export interface AnonymousSession {
  id: string
  displayName: string
}

const COOKIE_NAME = 'vibestar_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Simple cookie parser
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach((cookie) => {
    const [key, ...valueParts] = cookie.trim().split('=')
    if (key) {
      cookies[key] = decodeURIComponent(valueParts.join('='))
    }
  })
  return cookies
}

// Get session from cookies on the server
export function getSession(): AnonymousSession | null {
  const request = getRequest()
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = parseCookies(cookieHeader)

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

// Create a session cookie value
export function createSessionCookie(session: AnonymousSession): string {
  const value = encodeURIComponent(JSON.stringify(session))
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

// Generate a new anonymous session
export function generateSession(displayName: string): AnonymousSession {
  return {
    id: randomBytes(16).toString('hex'),
    displayName,
  }
}
