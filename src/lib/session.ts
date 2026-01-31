import { getRequest } from '@tanstack/start-server-core'
import { auth } from './auth'

// Get the current better-auth session from the request
export async function getSession() {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  return session
}
