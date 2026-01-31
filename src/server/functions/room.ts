import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import { generateRoomCode } from '@/lib/game/utils'
import { triggerEvent } from '@/lib/pusher/server'
import { getSession, generateSession, createSessionCookie } from '@/lib/session'
import type {
  RoomPlayerJoinedEvent,
  RoomPlayerLeftEvent,
} from '@/lib/pusher/events'

// Create a new game room
export const createRoom = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: { clipDuration?: number; maxPlayers?: number; displayName: string }) => data,
  )
  .handler(async ({ data }) => {
    if (!data.displayName?.trim()) {
      throw new Error('Display name is required')
    }

    // Generate a new session for this user
    const session = generateSession(data.displayName.trim())

    const code = generateRoomCode()
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

    const room = await prisma.gameRoom.create({
      data: {
        code,
        hostId: session.id,
        clipDuration: data.clipDuration ?? 15,
        maxPlayers: data.maxPlayers ?? 4,
        expiresAt,
        players: {
          create: {
            userId: session.id,
            displayName: session.displayName,
            isHost: true,
          },
        },
      },
      include: { players: true },
    })

    const cookie = createSessionCookie(session)

    return { room, cookie }
  })

// Get room by code
export const getRoomByCode = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const room = await prisma.gameRoom.findUnique({
      where: { code: data.code.toUpperCase() },
      include: {
        players: {
          orderBy: { joinedAt: 'asc' },
        },
        game: {
          select: { id: true },
        },
      },
    })

    return room
  })

// Join an existing room
export const joinRoom = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { code: string; displayName: string }) => data)
  .handler(async ({ data }) => {
    if (!data.displayName?.trim()) {
      throw new Error('Display name is required')
    }

    const room = await prisma.gameRoom.findUnique({
      where: { code: data.code.toUpperCase() },
      include: { players: true },
    })

    if (!room) {
      throw new Error('Room not found')
    }

    if (room.status !== 'WAITING') {
      throw new Error('Game already started')
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full')
    }

    // Check existing session
    let session = getSession()

    // Check if already in room with existing session
    if (session) {
      const existing = room.players.find((p) => p.userId === session!.id)
      if (existing) {
        return { room, player: existing, alreadyJoined: true, cookie: null }
      }
    }

    // Create new session if needed or update display name
    session = generateSession(data.displayName.trim())

    const player = await prisma.player.create({
      data: {
        userId: session.id,
        displayName: session.displayName,
        roomId: room.id,
      },
    })

    // Notify other players via Pusher
    await triggerEvent(`presence-room-${room.code}`, 'room:player-joined', {
      player: {
        id: player.id,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl ?? undefined,
      },
    } satisfies RoomPlayerJoinedEvent)

    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: room.id },
      include: { players: true },
    })

    const cookie = createSessionCookie(session)

    return { room: updatedRoom, player, alreadyJoined: false, cookie }
  })

// Leave a room
export const leaveRoom = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { roomId: string }) => data)
  .handler(async ({ data }) => {
    const session = getSession()
    if (!session) {
      throw new Error('Not logged in')
    }

    const player = await prisma.player.findFirst({
      where: {
        userId: session.id,
        roomId: data.roomId,
      },
      include: { room: true },
    })

    if (!player) {
      throw new Error('Not in this room')
    }

    const room = player.room

    // If host leaves, close the room
    if (player.isHost) {
      await prisma.gameRoom.update({
        where: { id: room.id },
        data: { status: 'ABANDONED' },
      })

      await triggerEvent(`presence-room-${room.code}`, 'room:closed', {
        reason: 'Host left the room',
      })
    } else {
      // Regular player leaves
      await prisma.player.delete({
        where: { id: player.id },
      })

      await triggerEvent(`presence-room-${room.code}`, 'room:player-left', {
        playerId: player.id,
      } satisfies RoomPlayerLeftEvent)
    }

    return { success: true }
  })

// Update room settings (host only)
export const updateRoomSettings = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: { roomId: string; clipDuration?: number; maxPlayers?: number }) =>
      data,
  )
  .handler(async ({ data }) => {
    const session = getSession()
    if (!session) {
      throw new Error('Not logged in')
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: data.roomId },
    })

    if (!room) {
      throw new Error('Room not found')
    }

    if (room.hostId !== session.id) {
      throw new Error('Only the host can update settings')
    }

    const updatedRoom = await prisma.gameRoom.update({
      where: { id: data.roomId },
      data: {
        clipDuration: data.clipDuration ?? room.clipDuration,
        maxPlayers: data.maxPlayers ?? room.maxPlayers,
      },
    })

    await triggerEvent(`presence-room-${room.code}`, 'room:settings-updated', {
      clipDuration: updatedRoom.clipDuration,
      maxPlayers: updatedRoom.maxPlayers,
    })

    return updatedRoom
  })
