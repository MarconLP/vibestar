import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import { generateRoomCode } from '@/lib/game/utils'
import { triggerEvent } from '@/lib/pusher/server'
import { getSession } from '@/lib/session'
import type {
  RoomPlayerJoinedEvent,
  RoomPlayerLeftEvent,
} from '@/lib/pusher/events'

// Create a new game room
export const createRoom = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: { clipDuration?: number; maxPlayers?: number }) => data,
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
    }

    const code = generateRoomCode()
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

    const room = await prisma.gameRoom.create({
      data: {
        code,
        hostId: session.user.id,
        clipDuration: data.clipDuration ?? 15,
        maxPlayers: data.maxPlayers ?? 10,
        expiresAt,
        players: {
          create: {
            userId: session.user.id,
            displayName: session.user.name || 'Anonymous',
            isHost: true,
          },
        },
      },
      include: { players: true },
    })

    return room
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
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
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

    // Check if already in room
    const existing = room.players.find((p) => p.userId === session.user.id)
    if (existing) {
      return { room, player: existing, alreadyJoined: true }
    }

    const player = await prisma.player.create({
      data: {
        userId: session.user.id,
        displayName: session.user.name || 'Anonymous',
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

    return { room: updatedRoom, player, alreadyJoined: false }
  })

// Leave a room
export const leaveRoom = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { roomId: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
    }

    const player = await prisma.player.findFirst({
      where: {
        userId: session.user.id,
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
    const session = await getSession()
    if (!session) {
      throw new Error('Not logged in')
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: data.roomId },
    })

    if (!room) {
      throw new Error('Room not found')
    }

    if (room.hostId !== session.user.id) {
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
