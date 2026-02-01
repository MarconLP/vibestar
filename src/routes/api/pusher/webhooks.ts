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

// Handle when a channel becomes empty
async function handleChannelVacated(channel: string) {
  // Handle room lobby vacancy - only clean up if no game started
  const roomCode = channel.match(/^presence-room-([A-Z0-9]+)$/)?.[1]
  if (roomCode) {
    try {
      await prisma.gameRoom.delete({
        where: {
          code: roomCode,
          game: null, // Only delete if no game exists
        },
      })
    } catch {
      // Room might already be deleted, have an active game, or not exist
    }
    return
  }

  // Handle game channel vacancy - clean up when game is over
  const gameId = channel.match(/^private-game-(.+)$/)?.[1]
  if (gameId) {
    try {
      await prisma.game.delete({
        where: { id: gameId },
      })
    } catch {
      // Game might already be deleted or not exist
    }
  }
}
