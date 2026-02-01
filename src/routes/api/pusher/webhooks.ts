import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { verifyWebhook } from '@/lib/pusher/server'
import { prisma } from '@/db'

export const Route = createFileRoute('/api/pusher/webhooks')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('x-pusher-signature')
        const key = request.headers.get('x-pusher-key')
        if (!signature || !key) {
          return json({ error: 'Missing signature or key' }, { status: 401 })
        }

        const body = await request.text()
        const payload = verifyWebhook(body, {
          'x-pusher-key': key,
          'x-pusher-signature': signature,
        })

        if (!payload) {
          return json({ error: 'Invalid signature' }, { status: 401 })
        }

        // Process each event
        for (const event of payload.events) {
          // Handle channel_vacated - room is empty, clean it up
          if (event.name === 'channel_vacated') {
            await handleChannelVacated(event.channel)
          }
        }

        return json({ received: true })
      },
    },
  },
})

// Extract room code from channel name (e.g., "presence-room-ABC123" -> "ABC123")
function extractRoomCode(channel: string): string | null {
  const match = channel.match(/^presence-room-([A-Z0-9]+)$/)
  return match ? match[1] : null
}

// Handle when a room channel becomes empty
async function handleChannelVacated(channel: string) {
  const roomCode = extractRoomCode(channel)
  if (!roomCode) {
    return // Not a room channel, ignore
  }

  // Delete the room and all associated data (cascade will handle players, games, etc.)
  try {
    await prisma.gameRoom.delete({
      where: { code: roomCode },
    })
  } catch {
    // Room might already be deleted or not exist
  }
}
