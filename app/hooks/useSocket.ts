import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import {
  RoomState,
  LocationBroadcast,
  PlayerCaughtEvent,
  ChatBroadcast,
  GameEndEvent,
  RevealStateUpdate,
  ErrorEvent,
  BonusAreaEnteredEvent,
  BonusAreaRemovedEvent,
} from '@/types';

export const useSocket = () => {
  const {
    setConnected,
    setConnectionError,
    updateRoom,
    updatePlayerLocation,
    addChatMessage,
    setRevealState,
    setGameEndData,
    setBonusReveal,
  } = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (error: Error) => {
      setConnectionError(error.message);
    });

    socket.on('roomState', (state: RoomState) => {
      console.log('📊 Room state received:', state.code, 'Players:', state.players?.map(p => ({ name: p.name, role: p.role })));
      updateRoom(state);
    });

    socket.on('locationUpdate', (update: LocationBroadcast) => {
      updatePlayerLocation(update);
    });

    socket.on('playerCaught', (event: PlayerCaughtEvent) => {
      // Handle in UI
    });

    socket.on('chatMessage', (message: ChatBroadcast) => {
      addChatMessage(message);
    });

    socket.on('gameEnd', (event: GameEndEvent) => {
      setGameEndData(event);
    });

    socket.on('revealState', (state: RevealStateUpdate) => {
      setRevealState(state);
    });

    socket.on('bonusAreaEntered', (event: BonusAreaEnteredEvent) => {
      setBonusReveal(event);
    });

    socket.on('bonusAreaRemoved', (event: BonusAreaRemovedEvent) => {
      // Room state will be updated automatically
    });

    socket.on('error', (error: ErrorEvent) => {
      setConnectionError(error.message);
    });

    return () => {
      // Only remove connection-related listeners, keep event listeners persistent
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  return { socket: getSocket() };
};