import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  SelectRolePayload,
  UpdateAreaPayload,
  LocationUpdatePayload,
  CatchAttemptPayload,
  CatchAttemptResponse,
  ChatMessagePayload,
  RoomState,
  PlayerState,
  RevealStateUpdate,
  PlayerCaughtEvent,
  LocationBroadcast,
  GameEndEvent,
  ChatBroadcast,
  ErrorEvent,
  Role,
  GameStatus,
  PlayerMovement,
} from './types/types';
import { roomStore } from './store/RoomStore';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Track player -> room mapping for socket cleanup
const playerRooms = new Map<string, string>();
const socketPlayers = new Map<string, string>();

// Track game timers for auto-ending games
const gameTimers = new Map<string, NodeJS.Timeout>();

// Rate limiting for location updates (1 Hz = 1 per second)
const locationUpdateLimits = new Map<string, number>();
const LOCATION_UPDATE_INTERVAL = 1000; // 1 second

// ============================================================================
// Utility Functions
// ============================================================================

function getRoomState(roomCode: string): RoomState | null {
  const room = roomStore.getRoom(roomCode);
  if (!room) return null;

  const players: PlayerState[] = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    location: p.location,
    isHost: p.isHost,
    isCaptured: p.isCaptured,
    isOutOfBounds: p.isOutOfBounds,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    area: room.area,
    players,
    startedAt: room.startedAt,
    gameDurationMs: room.gameDurationMs,
    revealState: room.revealState,
    bonusAreas: room.bonusAreas,
  };
}

function broadcastRoomState(roomCode: string): void {
  console.log(`📡 Broadcasting room state for room ${roomCode}`);
  const roomState = getRoomState(roomCode);
  if (!roomState) {
    console.log(`📡 No room state found for room ${roomCode}`);
    return;
  }

  // Get all sockets in the room
  const room = io.sockets.adapter.rooms.get(roomCode);
  const socketCount = room ? room.size : 0;
  console.log(`📡 Room ${roomCode} has ${socketCount} sockets`);
  
  // Debug: List all socket IDs in the room
  if (room) {
    const socketIds = Array.from(room);
    console.log(`📡 Socket IDs in room ${roomCode}:`, socketIds);
  }

  console.log(`📡 Broadcasting to room ${roomCode}:`, {
    code: roomState.code,
    players: roomState.players.map(p => ({ name: p.name, role: p.role })),
    area: roomState.area ? 'set' : 'null'
  });
  io.to(roomCode).emit('roomState', roomState);
}

function endGameByTimer(roomCode: string): void {
  const room = roomStore.getRoom(roomCode);
  if (!room) return;

  roomStore.endGame(roomCode);

  const players = Array.from(room.players.values());
  const police = players.filter((p) => p.role === Role.POLICE);
  const thieves = players.filter((p) => p.role === Role.THIEF);
  const captured = thieves.filter((p) => p.isCaptured);

  // Prepare movement data for replay
  console.log(`📊 Preparing movement data from ${room.movements.size} players`);
  const movements: PlayerMovement[] = Array.from(room.movements.entries())
    .map(([playerId, path]) => {
      const player = room.players.get(playerId);
      console.log(`   Player ${playerId}: ${player?.name} - ${path.length} locations, role: ${player?.role}`);
      if (!player || !player.role || path.length === 0) return null;
      return {
        playerId,
        playerName: player.name,
        role: player.role,
        path,
      };
    })
    .filter((m): m is PlayerMovement => m !== null);

  const gameDuration = room.startedAt ? Date.now() - room.startedAt : 0;

  console.log(`📊 Sending ${movements.length} player movements to clients`);
  movements.forEach((m, idx) => {
    console.log(`   ${idx + 1}. ${m.playerName} (${m.role}): ${m.path.length} locations`);
  });

  const endEvent: GameEndEvent = {
    reason: 'TIME_UP',
    policeCount: police.length,
    thievesCount: thieves.length,
    capturedCount: captured.length,
    timestamp: Date.now(),
    movements,
    gameDuration,
  };

  io.to(roomCode).emit('gameEnd', endEvent);
  console.log(`Game ended in room ${roomCode} by timer`);

  // Clear the timer
  if (gameTimers.has(roomCode)) {
    gameTimers.delete(roomCode);
  }

  broadcastRoomState(roomCode);
}

function canUpdateLocation(playerId: string): boolean {
  const now = Date.now();
  const lastUpdate = locationUpdateLimits.get(playerId) || 0;
  return now - lastUpdate >= LOCATION_UPDATE_INTERVAL;
}

function updateLocationLimit(playerId: string): void {
  locationUpdateLimits.set(playerId, Date.now());
}

function checkGameEnd(roomCode: string): void {
  const room = roomStore.getRoom(roomCode);
  if (!room || room.status !== GameStatus.IN_PROGRESS) return;

  const players = Array.from(room.players.values());
  const thieves = players.filter((p) => p.role === Role.THIEF);
  const capturedThieves = thieves.filter((p) => p.isCaptured);

  // Check if all thieves are captured
  if (thieves.length > 0 && thieves.length === capturedThieves.length) {
    roomStore.endGame(roomCode);

    const police = players.filter((p) => p.role === Role.POLICE);

    // Prepare movement data for replay
    console.log(`📊 Preparing movement data from ${room.movements.size} players`);
    const movements: PlayerMovement[] = Array.from(room.movements.entries())
      .map(([playerId, path]) => {
        const player = room.players.get(playerId);
        console.log(`   Player ${playerId}: ${player?.name} - ${path.length} locations, role: ${player?.role}`);
        if (!player || !player.role || path.length === 0) return null;
        return {
          playerId,
          playerName: player.name,
          role: player.role,
          path,
        };
      })
      .filter((m): m is PlayerMovement => m !== null);

    const gameDuration = room.startedAt ? Date.now() - room.startedAt : 0;

    console.log(`📊 Sending ${movements.length} player movements to clients`);
    movements.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ${m.playerName} (${m.role}): ${m.path.length} locations`);
    });

    const endEvent: GameEndEvent = {
      reason: 'ALL_THIEVES_CAPTURED',
      policeCount: police.length,
      thievesCount: thieves.length,
      capturedCount: capturedThieves.length,
      timestamp: Date.now(),
      movements,
      gameDuration,
    };

    io.to(roomCode).emit('gameEnd', endEvent);
    console.log(`Game ended in room ${roomCode} - all thieves captured`);

    // Clear the timer if it exists
    if (gameTimers.has(roomCode)) {
      clearTimeout(gameTimers.get(roomCode)!);
      gameTimers.delete(roomCode);
      console.log(`⏱️ Cleared game timer for room ${roomCode}`);
    }

    broadcastRoomState(roomCode);
  }
}

// ============================================================================
// Socket.IO Event Handlers
// ============================================================================

io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle socket reconnection - rejoin rooms
  socket.on('reconnect', () => {
    console.log(`Socket reconnected: ${socket.id}`);
    const playerId = socketPlayers.get(socket.id);
    if (playerId) {
      const roomCode = playerRooms.get(playerId);
      if (roomCode) {
        console.log(`Rejoining socket ${socket.id} to room ${roomCode}`);
        socket.join(roomCode);
      }
    }
  });

  // ------------------------------------------------------------------------
  // createRoom
  // ------------------------------------------------------------------------
  socket.on(
    'createRoom',
    (payload: CreateRoomPayload, callback: (res: CreateRoomResponse) => void) => {
      try {
        const playerId = uuidv4();
        const room = roomStore.createRoom(playerId, socket.id, payload.playerName);

        // Join socket room
        socket.join(room.code);
        playerRooms.set(playerId, room.code);
        socketPlayers.set(socket.id, playerId);

        console.log(
          `Room created: ${room.code} by ${payload.playerName} (${playerId})`
        );

        callback({
          success: true,
          roomCode: room.code,
          playerId,
        });

        broadcastRoomState(room.code);
      } catch (error) {
        console.error('Error creating room:', error);
        callback({
          success: false,
          error: 'Failed to create room',
        });
      }
    }
  );

  // ------------------------------------------------------------------------
  // joinRoom
  // ------------------------------------------------------------------------
  socket.on(
    'joinRoom',
    (payload: JoinRoomPayload, callback: (res: JoinRoomResponse) => void) => {
      try {
        const room = roomStore.getRoom(payload.roomCode);

        if (!room) {
          callback({
            success: false,
            error: 'Room not found',
          });
          return;
        }

        if (room.status !== GameStatus.LOBBY) {
          callback({
            success: false,
            error: 'Game already in progress',
          });
          return;
        }

        const playerId = uuidv4();
        const player = roomStore.addPlayer(
          payload.roomCode,
          playerId,
          socket.id,
          payload.playerName
        );

        if (!player) {
          callback({
            success: false,
            error: 'Failed to join room',
          });
          return;
        }

        // Join socket room
        socket.join(room.code);
        playerRooms.set(playerId, room.code);
        socketPlayers.set(socket.id, playerId);

        console.log(
          `Player ${payload.playerName} (${playerId}) joined room ${room.code}`
        );

        const roomState = getRoomState(room.code);
        callback({
          success: true,
          playerId,
          room: roomState!,
        });

        broadcastRoomState(room.code);
      } catch (error) {
        console.error('Error joining room:', error);
        callback({
          success: false,
          error: 'Failed to join room',
        });
      }
    }
  );

  // ------------------------------------------------------------------------
  // selectRole
  // ------------------------------------------------------------------------
  socket.on('selectRole', (payload: SelectRolePayload) => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;

      const room = roomStore.getRoom(roomCode);
      if (!room || room.status !== GameStatus.LOBBY) return;

      roomStore.updatePlayerRole(roomCode, playerId, payload.role);
      console.log(`Player ${playerId} selected role ${payload.role}`);

      broadcastRoomState(roomCode);
    } catch (error) {
      console.error('Error selecting role:', error);
      socket.emit('error', { message: 'Failed to select role' } as ErrorEvent);
    }
  });

  // ------------------------------------------------------------------------
  // updateArea
  // ------------------------------------------------------------------------
  socket.on('updateArea', (payload: UpdateAreaPayload) => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;

      const room = roomStore.getRoom(roomCode);
      if (!room || room.hostId !== playerId) {
        socket.emit('error', {
          message: 'Only host can update area',
        } as ErrorEvent);
        return;
      }

      roomStore.updateArea(roomCode, payload.area);
      console.log(`Area updated for room ${roomCode}`);

      broadcastRoomState(roomCode);
    } catch (error) {
      console.error('Error updating area:', error);
      socket.emit('error', { message: 'Failed to update area' } as ErrorEvent);
    }
  });

  // ------------------------------------------------------------------------
  // setGameDuration
  // ------------------------------------------------------------------------
  socket.on('setGameDuration', (payload: { durationMs: number | null }) => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;

      const room = roomStore.getRoom(roomCode);
      if (!room || room.hostId !== playerId) {
        socket.emit('error', {
          message: 'Only host can set game duration',
        } as ErrorEvent);
        return;
      }

      roomStore.setGameDuration(roomCode, payload.durationMs);
      console.log(`Game duration set for room ${roomCode}: ${payload.durationMs ? `${payload.durationMs / 60000}min` : 'No limit'}`);

      broadcastRoomState(roomCode);
    } catch (error) {
      console.error('Error setting game duration:', error);
      socket.emit('error', { message: 'Failed to set game duration' } as ErrorEvent);
    }
  });

  // ------------------------------------------------------------------------
  // startGame
  // ------------------------------------------------------------------------
  socket.on('startGame', () => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) {
        console.log('❌ Start game: No playerId');
        return;
      }

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) {
        console.log('❌ Start game: No roomCode');
        return;
      }

      const room = roomStore.getRoom(roomCode);
      if (!room) {
        console.log('❌ Start game: Room not found');
        return;
      }
      
      if (room.hostId !== playerId) {
        console.log('❌ Start game: Not the host');
        socket.emit('error', {
          message: 'Only host can start game',
        } as ErrorEvent);
        return;
      }

      console.log(`🎮 Attempting to start game in room ${roomCode}...`);
      console.log(`   Status: ${room.status}, Area: ${!!room.area}, Players with roles: ${Array.from(room.players.values()).filter(p => p.role).length}/${room.players.size}`);
      
      const success = roomStore.startGame(roomCode);
      if (!success) {
        console.log('❌ Start game failed!');
        socket.emit('error', {
          message: 'Cannot start game. Ensure all players have roles and area is set.',
        } as ErrorEvent);
        return;
      }

      console.log(`✅ Game started in room ${roomCode}!`);
      
      // Set up game timer if duration is specified
      if (room.gameDurationMs) {
        console.log(`⏱️ Setting up game timer for ${room.gameDurationMs / 60000} minutes`);
        const timer = setTimeout(() => {
          console.log(`⏰ Time's up! Auto-ending game in room ${roomCode}`);
          endGameByTimer(roomCode);
        }, room.gameDurationMs);
        gameTimers.set(roomCode, timer);
      }
      
      broadcastRoomState(roomCode);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' } as ErrorEvent);
    }
  });

  // ------------------------------------------------------------------------
  // locationUpdate (rate-limited to 1 Hz)
  // ------------------------------------------------------------------------
  socket.on('locationUpdate', (payload: LocationUpdatePayload) => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) {
        console.log(`❌ Location update: No playerId for socket ${socket.id}`);
        console.log(`   Socket map has ${socketPlayers.size} entries:`, Array.from(socketPlayers.keys()));
        return;
      }

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) {
        console.log('❌ Location update: No roomCode for player', playerId);
        return;
      }

      const room = roomStore.getRoom(roomCode);
      if (!room) {
        console.log('❌ Location update: Room not found', roomCode);
        return;
      }
      
      if (room.status !== GameStatus.IN_PROGRESS) {
        console.log(`⚠️ Location update rejected: Game status is ${room.status}, not IN_PROGRESS`);
        return;
      }

      // Rate limiting
      if (!canUpdateLocation(playerId)) {
        return; // Silently ignore if too frequent
      }

      console.log(`📍 Location accepted for player ${playerId}: (${payload.location.latitude.toFixed(4)}, ${payload.location.longitude.toFixed(4)})`);
      
      updateLocationLimit(playerId);
      roomStore.updatePlayerLocation(roomCode, playerId, payload.location);

      // Track movement history
      if (!room.movements.has(playerId)) {
        room.movements.set(playerId, []);
      }
      room.movements.get(playerId)!.push(payload.location);

      const player = room.players.get(playerId);
      if (!player) return;

      // Check if player entered a bonus area (thieves only)
      if (player.role === Role.THIEF) {
        const { inCircle } = require('./utils/distance');
        for (const bonusArea of room.bonusAreas) {
          if (!bonusArea.isActive) continue;
          
          const isInBonus = inCircle(
            payload.location.latitude,
            payload.location.longitude,
            bonusArea.center.latitude,
            bonusArea.center.longitude,
            bonusArea.radiusMeters
          );

          if (isInBonus) {
            console.log(`🎁 Player ${player.name} entered bonus area ${bonusArea.id}`);
            
            // Set reveal expiration for this player (5 seconds from now)
            const revealedUntil = Date.now() + 5000;
            room.bonusRevealState.set(playerId, { revealedUntil });

            // Emit bonus area entered event
            const bonusEvent: import('./types/types').BonusAreaEnteredEvent = {
              playerId,
              playerName: player.name,
              bonusAreaId: bonusArea.id,
              revealedUntil,
            };
            io.to(roomCode).emit('bonusAreaEntered', bonusEvent);

            // Remove the bonus area
            roomStore.removeBonusArea(roomCode, bonusArea.id);
            
            // Emit bonus area removed event
            const removedEvent: import('./types/types').BonusAreaRemovedEvent = {
              bonusAreaId: bonusArea.id,
            };
            io.to(roomCode).emit('bonusAreaRemoved', removedEvent);

            // Broadcast updated room state
            broadcastRoomState(roomCode);
            
            break; // Only trigger one bonus area at a time
          }
        }
      }

      // Broadcast location update
      const locationBroadcast: LocationBroadcast = {
        playerId,
        location: payload.location,
        isOutOfBounds: player.isOutOfBounds,
      };

      io.to(roomCode).emit('locationUpdate', locationBroadcast);

      // Send recent thief movement data to police (for heat map) - TEMPORARILY DISABLED
      // if (player.role === Role.THIEF) {
      //   const recentMovements = getRecentThiefMovements(room, playerId);
      //   if (recentMovements.length > 0) {
      //     const policeInRoom = Array.from(room.players.values())
      //       .filter(p => p.role === Role.POLICE);
      //     
      //     policeInRoom.forEach(police => {
      //       const policeSocket = Array.from(socketPlayers.entries())
      //         .find(([socketId, pid]) => pid === police.id)?.[0];
      //       if (policeSocket) {
      //         io.to(policeSocket).emit('thiefFootprints', {
      //           thiefId: playerId,
      //           thiefName: player.name,
      //           recentLocations: recentMovements,
      //         });
      //       }
      //     });
      //   }
      // }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  });

  // ------------------------------------------------------------------------
  // catchAttempt
  // ------------------------------------------------------------------------
  socket.on(
    'catchAttempt',
    (payload: CatchAttemptPayload, callback: (res: CatchAttemptResponse) => void) => {
      try {
        const captorId = socketPlayers.get(socket.id);
        if (!captorId) {
          callback({ success: false, error: 'Player not found' });
          return;
        }

        const roomCode = playerRooms.get(captorId);
        if (!roomCode) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const room = roomStore.getRoom(roomCode);
        if (!room || room.status !== GameStatus.IN_PROGRESS) {
          callback({ success: false, error: 'Game not in progress' });
          return;
        }

        const captor = room.players.get(captorId);
        const target = room.players.get(payload.targetPlayerId);

        if (!captor || !target) {
          callback({ success: false, error: 'Player not found' });
          return;
        }

        // Validate: captor must be police
        if (captor.role !== Role.POLICE) {
          callback({ success: false, error: 'Only police can catch thieves' });
          return;
        }

        // Validate: target must be thief
        if (target.role !== Role.THIEF) {
          callback({ success: false, error: 'Can only catch thieves' });
          return;
        }

        // Validate: target not already captured
        if (target.isCaptured) {
          callback({ success: false, error: 'Thief already captured' });
          return;
        }

        // Validate: captor is in bounds
        if (captor.isOutOfBounds) {
          callback({ success: false, error: 'You are out of bounds' });
          return;
        }

        // Validate: both have locations
        if (!captor.location || !target.location) {
          callback({ success: false, error: 'Location not available' });
          return;
        }

        // Calculate distance using simple formula
        const R = 6371e3; // metres
        const φ1 = (captor.location.latitude * Math.PI) / 180;
        const φ2 = (target.location.latitude * Math.PI) / 180;
        const Δφ = ((target.location.latitude - captor.location.latitude) * Math.PI) / 180;
        const Δλ = ((target.location.longitude - captor.location.longitude) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // in metres

        // Validate: within 50m
        if (distance > 50) {
          callback({ success: false, captured: false, distance });
          return;
        }

        // Capture successful!
        roomStore.capturePlayer(roomCode, target.id);

        const caughtEvent: PlayerCaughtEvent = {
          capturedPlayerId: target.id,
          capturedPlayerName: target.name,
          captorPlayerId: captor.id,
          captorPlayerName: captor.name,
          distance,
          timestamp: Date.now(),
        };

        io.to(roomCode).emit('playerCaught', caughtEvent);
        console.log(
          `Player ${captor.name} caught ${target.name} at ${distance.toFixed(2)}m`
        );

        callback({ success: true, captured: true, distance });

        broadcastRoomState(roomCode);
        checkGameEnd(roomCode);
      } catch (error) {
        console.error('Error processing catch attempt:', error);
        callback({ success: false, error: 'Failed to process catch attempt' });
      }
    }
  );

  // ------------------------------------------------------------------------
  // chatMessage
  // ------------------------------------------------------------------------
  socket.on('chatMessage', (payload: ChatMessagePayload) => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;

      const room = roomStore.getRoom(roomCode);
      if (!room) return;

      const player = room.players.get(playerId);
      if (!player) return;

      const chatBroadcast: ChatBroadcast = {
        playerId: player.id,
        playerName: player.name,
        message: payload.message,
        timestamp: Date.now(),
      };

      io.to(roomCode).emit('chatMessage', chatBroadcast);
      console.log(`Chat message from ${player.name} in ${roomCode}: ${payload.message}`);
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  });

  // ------------------------------------------------------------------------
  // endGame
  // ------------------------------------------------------------------------
  socket.on('endGame', () => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;

      const room = roomStore.getRoom(roomCode);
      if (!room || room.hostId !== playerId) {
        socket.emit('error', {
          message: 'Only host can end game',
        } as ErrorEvent);
        return;
      }

      roomStore.endGame(roomCode);

      const players = Array.from(room.players.values());
      const police = players.filter((p) => p.role === Role.POLICE);
      const thieves = players.filter((p) => p.role === Role.THIEF);
      const captured = thieves.filter((p) => p.isCaptured);

      // Prepare movement data for replay
      console.log(`📊 Preparing movement data from ${room.movements.size} players`);
      const movements: PlayerMovement[] = Array.from(room.movements.entries())
        .map(([playerId, path]) => {
          const player = room.players.get(playerId);
          console.log(`   Player ${playerId}: ${player?.name} - ${path.length} locations, role: ${player?.role}`);
          if (!player || !player.role || path.length === 0) return null;
          return {
            playerId,
            playerName: player.name,
            role: player.role,
            path,
          };
        })
        .filter((m): m is PlayerMovement => m !== null);

      const gameDuration = room.startedAt ? Date.now() - room.startedAt : 0;

      console.log(`📊 Sending ${movements.length} player movements to clients`);
      movements.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.playerName} (${m.role}): ${m.path.length} locations`);
      });

      const endEvent: GameEndEvent = {
        reason: 'HOST_ENDED',
        policeCount: police.length,
        thievesCount: thieves.length,
        capturedCount: captured.length,
        timestamp: Date.now(),
        movements,
        gameDuration,
      };

      io.to(roomCode).emit('gameEnd', endEvent);
      console.log(`Game ended in room ${roomCode} by host`);

      // Clear the timer if it exists
      if (gameTimers.has(roomCode)) {
        clearTimeout(gameTimers.get(roomCode)!);
        gameTimers.delete(roomCode);
        console.log(`⏱️ Cleared game timer for room ${roomCode}`);
      }

      broadcastRoomState(roomCode);
    } catch (error) {
      console.error('Error ending game:', error);
      socket.emit('error', { message: 'Failed to end game' } as ErrorEvent);
    }
  });

  // ------------------------------------------------------------------------
  // disconnect
  // ------------------------------------------------------------------------
  socket.on('disconnect', () => {
    try {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;

      console.log(`Player ${playerId} disconnected from room ${roomCode}`);

      roomStore.removePlayer(roomCode, playerId);
      socketPlayers.delete(socket.id);
      playerRooms.delete(playerId);
      locationUpdateLimits.delete(playerId);

      // Check if room still exists
      const room = roomStore.getRoom(roomCode);
      if (room) {
        broadcastRoomState(roomCode);

        // If host left and game is in lobby, end room
        if (room.hostId === playerId && room.status === GameStatus.LOBBY) {
          io.to(roomCode).emit('error', {
            message: 'Host left the room',
          } as ErrorEvent);
          roomStore.deleteRoom(roomCode);
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// ============================================================================
// Reveal Timer Loop
// ============================================================================

const REVEAL_INTERVAL = 120000; // 120 seconds (2 minutes)

function startRevealTimer() {
  setInterval(() => {
    const rooms = roomStore.getAllRooms();

    for (const room of rooms) {
      if (room.status !== GameStatus.IN_PROGRESS) continue;

      const now = Date.now();
      const { nextRevealAt } = room.revealState;

      // Check if time to reveal (or first reveal)
      if (nextRevealAt && now >= nextRevealAt) {
        // Get all thieves with locations (snapshot their CURRENT positions)
        const thieves = Array.from(room.players.values())
          .filter((p) => p.role === Role.THIEF && !p.isCaptured)
          .map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            location: p.location, // Static snapshot
            isHost: p.isHost,
            isCaptured: p.isCaptured,
            isOutOfBounds: p.isOutOfBounds,
          }));

        // Update reveal state for next reveal
        roomStore.updateRevealState(
          room.code,
          true, // isRevealing = true (to indicate static positions are shown)
          now + REVEAL_INTERVAL, // next reveal in 2 minutes
          null // no expiry - stays until next reveal
        );

        const revealUpdate: RevealStateUpdate = {
          isRevealing: true,
          nextRevealAt: now + REVEAL_INTERVAL,
          revealEndsAt: null, // No expiry - stays visible until next reveal
          revealedThieves: thieves, // Static positions
        };

        io.to(room.code).emit('revealState', revealUpdate);
        console.log(
          `📍 Reveal triggered in room ${room.code}: ${thieves.length} thieves revealed (static positions)`
        );
      }
    }
  }, 1000); // Check every second
}

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/rooms', (req, res) => {
  const rooms = roomStore.getAllRooms();
  const roomSummaries = rooms.map((r) => ({
    code: r.code,
    status: r.status,
    playerCount: r.players.size,
    hasArea: !!r.area,
    createdAt: r.createdAt,
  }));
  res.json(roomSummaries);
});

// ============================================================================
// Start Server
// ============================================================================

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 GeoHunt server running on ${HOST}:${PORT}`);
  console.log(`📍 WebSocket endpoint: ws://${HOST}:${PORT}`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📊 Rooms endpoint: http://${HOST}:${PORT}/rooms`);
  startRevealTimer();
});




