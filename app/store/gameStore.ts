import { create } from 'zustand';
import {
  RoomState,
  Role,
  Location,
  PlayerCaughtEvent,
  ChatBroadcast,
  GameEndEvent,
  RevealStateUpdate,
  LocationBroadcast,
  BonusAreaEnteredEvent,
  ThiefFootprintsEvent,
} from '@/types';

interface GameStore {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Player state
  playerId: string | null;
  playerName: string | null;
  
  // Room state
  room: RoomState | null;
  
  // Game state
  myLocation: Location | null;
  chatMessages: ChatBroadcast[];
  
  // Reveal state (for thieves to see police proximity)
  revealState: RevealStateUpdate | null;
  
  // Bonus reveal state (for bonus area reveals)
  bonusRevealedPlayers: Set<string>; // PlayerIds currently revealed by bonus
  bonusRevealedUntil: Map<string, number>; // PlayerId -> timestamp when reveal expires
  
  // Thief footprints (for police heat map)
  thiefFootprints: Map<string, Location[]>; // ThiefId -> recent locations
  
  // Game end state
  gameEndData: GameEndEvent | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoom: (room: RoomState | null) => void;
  updateRoom: (room: RoomState) => void;
  updatePlayerLocation: (update: LocationBroadcast) => void;
  setMyLocation: (location: Location) => void;
  addChatMessage: (message: ChatBroadcast) => void;
  setRevealState: (state: RevealStateUpdate) => void;
  setBonusReveal: (event: BonusAreaEnteredEvent) => void;
  clearExpiredBonusReveals: () => void;
  setThiefFootprints: (event: ThiefFootprintsEvent) => void;
  clearExpiredFootprints: () => void;
  setGameEndData: (data: GameEndEvent) => void;
  reset: () => void;
  
  // Computed getters
  getMyPlayer: () => any;
  isHost: () => boolean;
  myRole: () => Role | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  isConnected: false,
  connectionError: null,
  playerId: null,
  playerName: null,
  room: null,
  myLocation: null,
  chatMessages: [],
  revealState: null,
  bonusRevealedPlayers: new Set(),
  bonusRevealedUntil: new Map(),
  thiefFootprints: new Map(),
  gameEndData: null,
  
  // Actions
  setConnected: (connected) => set({ isConnected: connected }),
  
  setConnectionError: (error) => set({ connectionError: error }),
  
  setPlayerId: (id) => set({ playerId: id }),
  
  setPlayerName: (name) => set({ playerName: name }),
  
  setRoom: (room) => set({ room }),
  
  updateRoom: (room) => set({ room }),
  
  updatePlayerLocation: (update) =>
    set((state) => {
      if (!state.room) return state;
      
      const updatedPlayers = state.room.players.map((p) =>
        p.id === update.playerId
          ? { ...p, location: update.location, isOutOfBounds: update.isOutOfBounds }
          : p
      );
      
      return {
        room: {
          ...state.room,
          players: updatedPlayers,
        },
      };
    }),
  
  setMyLocation: (location) => set({ myLocation: location }),
  
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  
  setRevealState: (state) => set({ revealState: state }),
  
  setBonusReveal: (event) =>
    set((state) => {
      const newRevealed = new Set(state.bonusRevealedPlayers);
      newRevealed.add(event.playerId);
      
      const newRevealedUntil = new Map(state.bonusRevealedUntil);
      newRevealedUntil.set(event.playerId, event.revealedUntil);
      
      return {
        bonusRevealedPlayers: newRevealed,
        bonusRevealedUntil: newRevealedUntil,
      };
    }),
  
  clearExpiredBonusReveals: () =>
    set((state) => {
      const now = Date.now();
      const newRevealed = new Set<string>();
      const newRevealedUntil = new Map<string, number>();
      
      state.bonusRevealedUntil.forEach((expiry, playerId) => {
        if (expiry > now) {
          newRevealed.add(playerId);
          newRevealedUntil.set(playerId, expiry);
        }
      });
      
      return {
        bonusRevealedPlayers: newRevealed,
        bonusRevealedUntil: newRevealedUntil,
      };
    }),
  
  setGameEndData: (data) => set({ gameEndData: data }),
  
  reset: () =>
    set({
      playerId: null,
      playerName: null,
      room: null,
      myLocation: null,
      chatMessages: [],
      revealState: null,
      bonusRevealedPlayers: new Set(),
      bonusRevealedUntil: new Map(),
      gameEndData: null,
      connectionError: null,
    }),
  
  // Computed getters
  getMyPlayer: () => {
    const state = get();
    if (!state.room || !state.playerId) return null;
    return state.room.players.find((p) => p.id === state.playerId);
  },
  
  isHost: () => {
    const state = get();
    return state.room?.hostId === state.playerId;
  },
  
  myRole: () => {
    const player = get().getMyPlayer();
    return player?.role || null;
  },
}));






