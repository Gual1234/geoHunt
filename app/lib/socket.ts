import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const getServerUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.SERVER_URL;
  if (configUrl) {
    return configUrl;
  }
  
  const FLY_APP_NAME = 'geohunt-server';
  return `https://${FLY_APP_NAME}.fly.dev`;
};

const SERVER_URL = getServerUrl();
let socketInstance: Socket | null = null;
let isInitializing = false;

export const getSocket = (): Socket => {
  // Return existing socket if it exists
  if (socketInstance) {
    return socketInstance;
  }
  
  // If already initializing, wait and return the socket (prevents race conditions)
  // This handles the edge case where two calls happen simultaneously
  if (isInitializing) {
    // Socket should exist by now, but in rare race conditions wait a tick
    // In practice, socketInstance is set synchronously, so this check should pass
    if (socketInstance) {
      return socketInstance;
    }
    // Fallback: create socket anyway (shouldn't happen)
    console.warn('⚠️ Race condition detected in socket creation');
  }
  
  // Set flag and create socket atomically
  isInitializing = true;
  
  console.log('🔌 Creating NEW socket instance');
  
  // Create new socket instance
  socketInstance = io(SERVER_URL, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 20000,
    autoConnect: true,
  });
  
  // Clear initialization flag
  isInitializing = false;
  
  console.log('✅ Socket instance created:', socketInstance.id || 'connecting...');
  
  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    isInitializing = false;
  }
};