import { useEffect, useState, useCallback, useRef } from 'react'
import type { Channel, PresenceChannel } from 'pusher-js'
import { getPusherClient } from '@/lib/pusher/client'

export function usePusher() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const pusher = getPusherClient()

    const handleConnected = () => setIsConnected(true)
    const handleDisconnected = () => setIsConnected(false)

    pusher.connection.bind('connected', handleConnected)
    pusher.connection.bind('disconnected', handleDisconnected)

    // Check initial state
    if (pusher.connection.state === 'connected') {
      setIsConnected(true)
    }

    return () => {
      pusher.connection.unbind('connected', handleConnected)
      pusher.connection.unbind('disconnected', handleDisconnected)
    }
  }, [])

  return { isConnected }
}

export function useChannel(channelName: string | null) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const channelRef = useRef<Channel | null>(null)

  useEffect(() => {
    if (!channelName) {
      setChannel(null)
      return
    }

    const pusher = getPusherClient()
    const subscribedChannel = pusher.subscribe(channelName)
    channelRef.current = subscribedChannel
    setChannel(subscribedChannel)

    return () => {
      pusher.unsubscribe(channelName)
      channelRef.current = null
    }
  }, [channelName])

  const bind = useCallback(
    <T>(event: string, callback: (data: T) => void) => {
      if (channelRef.current) {
        channelRef.current.bind(event, callback)
      }
    },
    []
  )

  const unbind = useCallback((event: string) => {
    if (channelRef.current) {
      channelRef.current.unbind(event)
    }
  }, [])

  return { channel, bind, unbind }
}

interface PresenceMember {
  id: string
  info: {
    displayName: string
    avatarUrl?: string
  }
}

export function usePresenceChannel(channelName: string | null) {
  const [members, setMembers] = useState<Map<string, PresenceMember['info']>>(new Map())
  const [myId, setMyId] = useState<string | null>(null)
  const channelRef = useRef<PresenceChannel | null>(null)

  useEffect(() => {
    if (!channelName || !channelName.startsWith('presence-')) {
      setMembers(new Map())
      setMyId(null)
      return
    }

    const pusher = getPusherClient()
    const channel = pusher.subscribe(channelName) as PresenceChannel
    channelRef.current = channel

    channel.bind('pusher:subscription_succeeded', (data: { members: Record<string, PresenceMember['info']>; myID: string }) => {
      const memberMap = new Map<string, PresenceMember['info']>()
      for (const [id, info] of Object.entries(data.members)) {
        memberMap.set(id, info)
      }
      setMembers(memberMap)
      setMyId(data.myID)
    })

    channel.bind('pusher:member_added', (member: PresenceMember) => {
      setMembers((prev) => {
        const next = new Map(prev)
        next.set(member.id, member.info)
        return next
      })
    })

    channel.bind('pusher:member_removed', (member: PresenceMember) => {
      setMembers((prev) => {
        const next = new Map(prev)
        next.delete(member.id)
        return next
      })
    })

    return () => {
      pusher.unsubscribe(channelName)
      channelRef.current = null
    }
  }, [channelName])

  const bind = useCallback(
    <T>(event: string, callback: (data: T) => void) => {
      if (channelRef.current) {
        channelRef.current.bind(event, callback)
      }
    },
    []
  )

  const unbind = useCallback((event: string) => {
    if (channelRef.current) {
      channelRef.current.unbind(event)
    }
  }, [])

  return { members, myId, bind, unbind }
}
