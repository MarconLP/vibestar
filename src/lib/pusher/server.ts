import Pusher from 'pusher'
import { createHmac } from 'crypto'

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

// Webhook event types from Pusher
export interface PusherWebhookEvent {
  name: 'channel_occupied' | 'channel_vacated' | 'member_added' | 'member_removed'
  channel: string
  user_id?: string
}

export interface PusherWebhookPayload {
  time_ms: number
  events: PusherWebhookEvent[]
}

// Verify and parse a Pusher webhook request
export function verifyWebhook(
  body: string,
  headers: { 'x-pusher-key': string; 'x-pusher-signature': string }
): PusherWebhookPayload | null {
  const secret = process.env.PUSHER_SECRET
  const key = process.env.PUSHER_KEY

  if (!secret || !key) {
    return null
  }

  // Verify the key matches
  if (headers['x-pusher-key'] !== key) {
    return null
  }

  // Verify signature using HMAC-SHA256
  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  if (headers['x-pusher-signature'] !== expectedSignature) {
    return null
  }

  return JSON.parse(body) as PusherWebhookPayload
}
