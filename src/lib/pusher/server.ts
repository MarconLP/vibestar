import Pusher from 'pusher'

let pusherInstance: Pusher | null = null

export function getPusher(): Pusher {
  if (!pusherInstance) {
    const appId = process.env.PUSHER_APP_ID
    const key = process.env.PUSHER_KEY
    const secret = process.env.PUSHER_SECRET
    const cluster = process.env.PUSHER_CLUSTER

    if (!appId || !key || !secret || !cluster) {
      throw new Error('Pusher environment variables not configured')
    }

    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  }

  return pusherInstance
}

// Trigger an event on a channel
export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown
): Promise<void> {
  const pusher = getPusher()
  await pusher.trigger(channel, event, data)
}

// Authorize a user for private/presence channels
export function authorizeChannel(
  socketId: string,
  channel: string,
  presenceData?: { user_id: string; user_info?: Record<string, unknown> }
): Pusher.ChannelAuthResponse {
  const pusher = getPusher()

  if (channel.startsWith('presence-') && presenceData) {
    return pusher.authorizeChannel(socketId, channel, presenceData)
  }

  return pusher.authorizeChannel(socketId, channel)
}
