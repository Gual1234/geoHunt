// Test script to verify Socket.IO connection
const { io } = require('socket.io-client');

const socket = io('http://192.168.1.223:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.log('✅ Test connection successful:', socket.id);
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Test connection failed:', error.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test connection timeout');
  process.exit(1);
}, 10000);














