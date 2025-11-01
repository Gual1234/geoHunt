import {
  Room,
  Player,
  GameStatus,
  Role,
  Area,
  Location,
  BonusArea,
} from '../types/types';
import { generateRoomCode } from '../utils/roomCode';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory room store
 * TODO: Replace with Redis adapter for production scalability
 * 
 * Redis adapter would look like:
 * - Store rooms as Redis hashes with TTL
 * - Use Redis pub/sub for cross-server communication
 * - Implement room locking with Redis locks
 */
export class RoomStore {
  private rooms: Map<string, Room> = new Map();

  createRoom(hostId: string, hostSocketId: string, hostName: string): Room {
    const code = this.generateUniqueCode();
    const now = Date.now();

    const host: Player = {
      id: hostId,
      socketId: hostSocketId,
      name: hostName,
      role: null,
      location: null,
      isHost: true,
      isCaptured: false,
      isOutOfBounds: false,
      lastLocationUpdate: 0,
    };

    const room: Room = {
      code,
      hostId,
      status: GameStatus.LOBBY,
      area: null,
      players: new Map([[hostId, host]]),
      createdAt: now,
      startedAt: null,
      endedAt: null,
      gameDurationMs: null,
      revealState: {
        isRevealing: false,
        nextRevealAt: null,
        revealEndsAt: null,
      },
      movements: new Map(),
      bonusAreas: [],
      bonusRevealState: new Map(),
    };

    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code.toUpperCase());
  }

  addPlayer(
    code: string,
    playerId: string,
    socketId: string,
    playerName: string
  ): Player | null {
    const room = this.getRoom(code);
    if (!room) return null;

    if (room.status !== GameStatus.LOBBY) return null;

    const player: Player = {
      id: playerId,
      socketId: socketId,
      name: playerName,
      role: null,
      location: null,
      isHost: false,
      isCaptured: false,
      isOutOfBounds: false,
      lastLocationUpdate: 0,
    };

    room.players.set(playerId, player);
    return player;
  }

  removePlayer(code: string, playerId: string): void {
    const room = this.getRoom(code);
    if (!room) return;

    room.players.delete(playerId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.deleteRoom(code);
    }
  }

  updatePlayerRole(code: string, playerId: string, role: Role): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.role = role;
    return true;
  }

  updatePlayerLocation(
    code: string,
    playerId: string,
    location: Location
  ): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.location = location;
    player.lastLocationUpdate = Date.now();

    // Check if player is out of bounds
    if (room.area) {
      const { inCircle } = require('../utils/distance');
      player.isOutOfBounds = !inCircle(
        location.latitude,
        location.longitude,
        room.area.center.latitude,
        room.area.center.longitude,
        room.area.radiusMeters
      );
    }

    return true;
  }

  updatePlayerSocketId(code: string, playerId: string, socketId: string): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.socketId = socketId;
    return true;
  }

  updateArea(code: string, area: Area): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    room.area = area;
    return true;
  }

  setGameDuration(code: string, durationMs: number | null): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    room.gameDurationMs = durationMs;
    return true;
  }

  startGame(code: string): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    if (room.status !== GameStatus.LOBBY) return false;
    if (!room.area) return false;

    // Validate that all players have selected roles
    const players = Array.from(room.players.values());
    if (players.some((p) => !p.role)) return false;

    room.status = GameStatus.IN_PROGRESS;
    room.startedAt = Date.now();
    room.revealState.nextRevealAt = Date.now() + 120000; // First reveal in 120s

    // Generate bonus areas
    room.bonusAreas = this.generateBonusAreas(room.area, 3);
    console.log(`🎁 Generated ${room.bonusAreas.length} bonus areas for room ${code}`);

    return true;
  }

  private generateBonusAreas(gameArea: Area, count: number): BonusArea[] {
    const bonusAreas: BonusArea[] = [];
    const bonusRadius = 25; // 25 meter radius for bonus areas
    
    // Generate random points inside the game area
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let validPosition = false;
      let latitude = 0;
      let longitude = 0;

      // Try to find a valid position (not too close to edge or other bonus areas)
      while (!validPosition && attempts < 50) {
        // Generate random point within game area
        const angle = Math.random() * 2 * Math.PI;
        // Use square root for uniform distribution in circle
        const distance = Math.sqrt(Math.random()) * (gameArea.radiusMeters - bonusRadius - 50);
        
        // Convert distance and angle to lat/lng offset
        // Rough approximation: 1 degree latitude ≈ 111,000 meters
        const latOffset = (distance * Math.cos(angle)) / 111000;
        const lngOffset = (distance * Math.sin(angle)) / (111000 * Math.cos(gameArea.center.latitude * Math.PI / 180));
        
        latitude = gameArea.center.latitude + latOffset;
        longitude = gameArea.center.longitude + lngOffset;

        // Check if this position is far enough from other bonus areas (at least 100m apart)
        validPosition = true;
        for (const existing of bonusAreas) {
          const { calculateDistance } = require('../utils/distance');
          const dist = calculateDistance(
            latitude,
            longitude,
            existing.center.latitude,
            existing.center.longitude
          );
          if (dist < 100) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
      }

      if (validPosition) {
        bonusAreas.push({
          id: uuidv4(),
          center: { latitude, longitude },
          radiusMeters: bonusRadius,
          isActive: true,
        });
      }
    }

    return bonusAreas;
  }

  removeBonusArea(code: string, bonusAreaId: string): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const index = room.bonusAreas.findIndex((ba) => ba.id === bonusAreaId);
    if (index === -1) return false;

    room.bonusAreas.splice(index, 1);
    return true;
  }

  endGame(code: string): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    room.status = GameStatus.ENDED;
    room.endedAt = Date.now();
    return true;
  }

  capturePlayer(code: string, playerId: string): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.isCaptured = true;
    return true;
  }

  updateRevealState(
    code: string,
    isRevealing: boolean,
    nextRevealAt: number | null,
    revealEndsAt: number | null
  ): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    room.revealState = {
      isRevealing,
      nextRevealAt,
      revealEndsAt,
    };

    return true;
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  private generateUniqueCode(): string {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    return code;
  }
}

// Singleton instance
export const roomStore = new RoomStore();







