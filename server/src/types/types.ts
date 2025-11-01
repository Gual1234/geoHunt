// Shared types for GeoHunt - Police vs Thieves

export enum Role {
  POLICE = 'POLICE',
  THIEF = 'THIEF',
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  IN_PROGRESS = 'IN_PROGRESS',
  ENDED = 'ENDED',
}

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface Area {
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
}

export interface BonusArea {
  id: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  isActive: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  role: Role | null;
  location: Location | null;
  isHost: boolean;
  isCaptured: boolean;
  isOutOfBounds: boolean;
  lastLocationUpdate: number;
}

export interface Room {
  code: string;
  hostId: string;
  status: GameStatus;
  area: Area | null;
  players: Map<string, Player>;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  gameDurationMs: number | null; // Game duration in milliseconds (null = no timer)
  revealState: {
    isRevealing: boolean;
    nextRevealAt: number | null;
    revealEndsAt: number | null;
  };
  movements: Map<string, Location[]>;
  bonusAreas: BonusArea[];
  bonusRevealState: Map<string, { revealedUntil: number }>; // playerId -> when reveal expires
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// ============================================================================
// Socket.IO Event Payloads
// ============================================================================

// Client → Server events
export interface CreateRoomPayload {
  playerName: string;
}

export interface CreateRoomResponse {
  success: boolean;
  roomCode?: string;
  playerId?: string;
  error?: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface JoinRoomResponse {
  success: boolean;
  playerId?: string;
  room?: RoomState;
  error?: string;
}

export interface SelectRolePayload {
  role: Role;
}

export interface UpdateAreaPayload {
  area: Area;
}

export interface LocationUpdatePayload {
  location: Location;
}

export interface CatchAttemptPayload {
  targetPlayerId: string;
}

export interface CatchAttemptResponse {
  success: boolean;
  captured?: boolean;
  distance?: number;
  error?: string;
}

export interface ChatMessagePayload {
  message: string;
}

// Server → Client broadcasts
export interface RoomState {
  code: string;
  hostId: string;
  status: GameStatus;
  area: Area | null;
  players: PlayerState[];
  startedAt: number | null;
  gameDurationMs: number | null;
  revealState: {
    isRevealing: boolean;
    nextRevealAt: number | null;
    revealEndsAt: number | null;
  };
  bonusAreas: BonusArea[];
}

export interface PlayerState {
  id: string;
  name: string;
  role: Role | null;
  location: Location | null;
  isHost: boolean;
  isCaptured: boolean;
  isOutOfBounds: boolean;
}

export interface RevealStateUpdate {
  isRevealing: boolean;
  nextRevealAt: number | null;
  revealEndsAt: number | null;
  revealedThieves?: PlayerState[];
}

export interface PlayerCaughtEvent {
  capturedPlayerId: string;
  capturedPlayerName: string;
  captorPlayerId: string;
  captorPlayerName: string;
  distance: number;
  timestamp: number;
}

export interface LocationBroadcast {
  playerId: string;
  location: Location;
  isOutOfBounds: boolean;
}

export interface PlayerMovement {
  playerId: string;
  playerName: string;
  role: Role;
  path: Location[];
}

export interface GameEndEvent {
  reason: 'ALL_THIEVES_CAPTURED' | 'HOST_ENDED' | 'TIME_LIMIT' | 'TIME_UP';
  policeCount: number;
  thievesCount: number;
  capturedCount: number;
  timestamp: number;
  movements?: PlayerMovement[];
  gameDuration?: number;
}

export interface ThiefFootprintsEvent {
  thiefId: string;
  thiefName: string;
  recentLocations: Location[];
}

export interface ChatBroadcast {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface BonusAreaEnteredEvent {
  playerId: string;
  playerName: string;
  bonusAreaId: string;
  revealedUntil: number; // timestamp when reveal expires
}

export interface BonusAreaRemovedEvent {
  bonusAreaId: string;
}

// Error event
export interface ErrorEvent {
  message: string;
  code?: string;
}


