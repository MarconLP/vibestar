import PusherClient from 'pusher-js'

let pusherClient: PusherClient | null = null

export function getPusherClient(): PusherClient {
  if (typeof window === 'undefined') {
    throw new Error('Pusher client can only be used in the browser')
  }

  if (!pusherClient) {
    const key = import.meta.env.VITE_PUSHER_KEY
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER

    if (!key || !cluster) {
      throw new Error('Pusher client environment variables not configured')
    }

    pusherClient = new PusherClient(key, {
      cluster,
      authEndpoint: '/api/pusher/auth',
    })
  }

  return pusherClient
}

export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect()
    pusherClient = null
  }
}
