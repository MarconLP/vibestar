import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { authorizeChannel } from '@/lib/pusher/server'

export const Route = createFileRoute('/api/pusher/auth')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Parse the session from cookies
        const cookieHeader = request.headers.get('cookie') || ''
        const cookies: Record<string, string> = {}
        cookieHeader.split(';').forEach((cookie) => {
          const [key, ...valueParts] = cookie.trim().split('=')
          if (key) {
            cookies[key] = decodeURIComponent(valueParts.join('='))
          }
        })

        const sessionCookie = cookies['vibestar_session']
        if (!sessionCookie) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        let session: { id: string; displayName: string }
        try {
          session = JSON.parse(sessionCookie)
        } catch {
          return json({ error: 'Invalid session' }, { status: 401 })
        }

        const formData = await request.formData()
        const socketId = formData.get('socket_id') as string
        const channelName = formData.get('channel_name') as string

        if (!socketId || !channelName) {
          return json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
        }

        // For presence channels, include user info
        if (channelName.startsWith('presence-')) {
          const authResponse = authorizeChannel(socketId, channelName, {
            user_id: session.id,
            user_info: {
              displayName: session.displayName,
            },
          })
          return json(authResponse)
        }

        // For private channels
        if (channelName.startsWith('private-')) {
          const authResponse = authorizeChannel(socketId, channelName)
          return json(authResponse)
        }

        return json({ error: 'Invalid channel type' }, { status: 400 })
      },
    },
  },
})
