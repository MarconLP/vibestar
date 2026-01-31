import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { authorizeChannel } from '@/lib/pusher/server'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/pusher/auth')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Get session from better-auth
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
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
            user_id: session.user.id,
            user_info: {
              displayName: session.user.name || 'Anonymous',
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
