import { createServerFn } from '@tanstack/react-start'
import { getSession, generateSession, createSessionCookie } from '@/lib/session'

// Set display name and create/update session
export const setDisplayName = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { displayName: string }) => data)
  .handler(async ({ data }) => {
    const existingSession = getSession()

    // If session exists, update the display name
    const session = existingSession
      ? { ...existingSession, displayName: data.displayName }
      : generateSession(data.displayName)

    const cookie = createSessionCookie(session)

    return {
      session,
      headers: {
        'Set-Cookie': cookie,
      },
    }
  })

// Get current session
export const getCurrentSession = createServerFn({
  method: 'GET',
}).handler(async () => {
  return getSession()
})
