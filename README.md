# GeoHunt - Police vs Thieves

A real-time multiplayer mobile game built with React Native (Expo) and Socket.IO WebSockets where players compete as either Police or Thieves in a location-based gameplay experience.

## Project Structure

```
geo-hunt/
├── server/          # Node.js + Express + Socket.IO backend
├── app/             # Expo React Native client (to be implemented)
├── shared/          # Shared TypeScript types
└── README.md
```

## Phase 1: Server Setup ✅

This phase implements the WebSocket server with Socket.IO, including:

- ✅ Room management with 6-character room codes
- ✅ Player join/leave handling
- ✅ Role selection (Police/Thief)
- ✅ Game area configuration
- ✅ Location updates with 1 Hz rate limiting
- ✅ Reveal timer (120s intervals, 5s duration)
- ✅ Catch attempt validation (50m radius, haversine distance)
- ✅ Out-of-bounds detection
- ✅ Chat messaging
- ✅ Game state management

## Tech Stack

### Server
- **Node.js** with TypeScript
- **Express** for HTTP endpoints
- **Socket.IO** for WebSocket communication
- **In-memory store** (with Redis adapter placeholder)

### Shared
- TypeScript types for events and models

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo Go app (for mobile testing)

### Important: Types Setup

The shared types from `/shared/types.ts` are copied to `/app/types.ts` for better module resolution with Expo Metro bundler.

**To sync types after updates:**
```bash
./sync-types.sh
```

### Server Setup

1. **Install dependencies:**

```bash
cd server
npm install
```

2. **Create environment file:**

```bash
cp .env.example .env
```

The default configuration uses port 3000. You can modify this in `.env`:

```env
PORT=3000
NODE_ENV=development
```

3. **Run the development server:**

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot-reloading enabled.

### Server Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled production server
- `npm run type-check` - Run TypeScript type checking

## Testing the Server

### Health Check

Test if the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### View Active Rooms

List all active rooms:

```bash
curl http://localhost:3000/rooms
```

### WebSocket Events Testing

You can test WebSocket events using a Socket.IO client. Here's a quick test using Node.js:

```javascript
// test-client.js
const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Create a room
  socket.emit('createRoom', { playerName: 'TestPlayer' }, (response) => {
    console.log('Room created:', response);
  });
});

socket.on('roomState', (state) => {
  console.log('Room state updated:', state);
});
```

## Socket.IO Events

### Client → Server

| Event | Payload | Ack Response | Description |
|-------|---------|--------------|-------------|
| `createRoom` | `{ playerName: string }` | `CreateRoomResponse` | Create a new game room |
| `joinRoom` | `{ roomCode: string, playerName: string }` | `JoinRoomResponse` | Join an existing room |
| `selectRole` | `{ role: 'POLICE' \| 'THIEF' }` | - | Select player role |
| `updateArea` | `{ area: Area }` | - | Set game area (host only) |
| `startGame` | - | - | Start the game (host only) |
| `locationUpdate` | `{ location: Location }` | - | Update player location (1 Hz rate limit) |
| `catchAttempt` | `{ targetPlayerId: string }` | `CatchAttemptResponse` | Attempt to catch a thief |
| `chatMessage` | `{ message: string }` | - | Send chat message |
| `endGame` | - | - | End the game (host only) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `roomState` | `RoomState` | Full room state update |
| `revealState` | `RevealStateUpdate` | Thief reveal state changed |
| `locationUpdate` | `LocationBroadcast` | Player location update |
| `playerCaught` | `PlayerCaughtEvent` | Thief was caught |
| `chatMessage` | `ChatBroadcast` | Chat message broadcast |
| `gameEnd` | `GameEndEvent` | Game ended |
| `error` | `ErrorEvent` | Error occurred |

## Server Features

### Reveal Timer

- Every 120 seconds, all thieves are revealed to police for 5 seconds
- Server automatically manages reveal windows
- Broadcasts `revealState` events to all players

### Distance Validation

- Uses Haversine formula for accurate distance calculation
- Catch attempts require ≤50m distance
- Out-of-bounds checking for circular game area

### Rate Limiting

- Location updates limited to 1 Hz (1 per second per player)
- Prevents client spam and reduces bandwidth

### In-Memory Store

The current implementation uses an in-memory Map for storing rooms. For production scaling, this can be replaced with Redis:

```typescript
// Future Redis adapter implementation
// - Store rooms as Redis hashes with TTL
// - Use Redis pub/sub for cross-server Socket.IO events
// - Implement distributed locks for catch attempts
```

## Game Flow

1. **Lobby Phase**
   - Host creates room with 6-char code
   - Players join and select roles (Police/Thief)
   - Host sets circular game area on map
   - Host starts game when ready

2. **In Progress Phase**
   - All players see their own location (1 Hz updates)
   - Police see thieves every 120s for 5s
   - Thieves see distance radar to nearest police
   - Police can attempt catches within 50m
   - Out-of-bounds players cannot catch/be caught
   - Room-wide chat available

3. **End Phase**
   - Game ends when all thieves captured
   - Host can manually end game
   - Summary shows stats

## Phase 2: Client Setup ✅

This phase implements the Expo React Native client with:

- ✅ Expo Router navigation (Start, Lobby, Game, Summary)
- ✅ Socket.IO client integration
- ✅ Zustand state management
- ✅ React Query setup
- ✅ Location tracking with expo-location
- ✅ Map integration with react-native-maps
- ✅ Real-time room/lobby system
- ✅ Role selection UI
- ✅ Game screen with placeholder map

### Client Setup

1. **Install dependencies:**

```bash
cd app
npm install
```

2. **Set up environment:**

Create `.env` file in `/app`:
```
SERVER_URL=http://localhost:3000
```

For Android emulator, use your computer's IP:
```
SERVER_URL=http://192.168.1.X:3000
```

3. **Start the Expo development server:**

```bash
npm start
```

4. **Run on device/emulator:**

- iOS Simulator: Press `i` in the terminal
- Android Emulator: Press `a` in the terminal
- Physical Device: Scan QR code with Expo Go app

### Testing the Full Stack

1. **Start the server** (in one terminal):
```bash
cd server
npm run dev
```

2. **Start the client** (in another terminal):
```bash
cd app
npm start
```

3. **Test the flow:**
   - Open app on device/emulator
   - Create a room (host)
   - Note the 6-character room code
   - Open app on second device/emulator
   - Join room with code
   - Select roles (Police/Thief)
   - Host sets area and starts game
   - Game screen shows map with location tracking

## Phase 3: Advanced Gameplay ✅

This phase implements all core gameplay mechanics:

- ✅ **Reveal Timer UI** - Countdown display (120s wait, 5s reveal windows)
- ✅ **Thief Radar** - Color-coded distance to nearest police (green/yellow/orange/red)
- ✅ **Enhanced Map Markers** - Police see all thieves during reveals
- ✅ **Catch Mechanics** - Police can catch thieves within 50m with validation
- ✅ **Chat System** - Sliding chat panel with real-time messaging
- ✅ **Player Caught Notifications** - Animated toasts when captures occur

### New Components

**Game Mechanics:**
- `components/RevealTimer.tsx` - Shows countdowns and reveal state
- `components/ThiefRadar.tsx` - Distance indicator with threat levels
- `components/CatchButton.tsx` - Interactive catch interface
- `components/ChatPanel.tsx` - Full-featured chat UI
- `components/PlayerCaughtToast.tsx` - Animated notifications

### Gameplay Features

**For Police 👮:**
- See countdown to next reveal
- During 5s reveal: see all thief positions on map
- Catch button appears when within 50m of thieves
- Tap to catch with server-side validation

**For Thieves 🥷:**
- Real-time radar showing distance to nearest police
- Color changes based on threat level:
  - Green ≥200m (Safe)
  - Yellow 200-100m (Caution)  
  - Orange 100-50m (Close!)
  - Red <50m (DANGER!)

**For Everyone:**
- Reveal timer visible to all players
- Chat panel with room-wide messaging
- Notifications when anyone is caught
- Enhanced map with role-colored markers

### Testing Phase 3

Complete game flow with 2+ players:

1. **Start Game** - Assign roles (mix of police/thieves)
2. **Initial Phase** - Thieves see radar, police see countdown
3. **First Reveal (2:00)** - Police see all thieves for 5 seconds
4. **Chase** - Police pursue based on reveal intel, thieves evade using radar
5. **Catch** - Police within 50m tap catch button
6. **Notification** - All players see catch toast
7. **Victory** - Game ends when all thieves caught

**See [PHASE3_COMPLETE.md](./PHASE3_COMPLETE.md) for detailed testing guide.**

## Phase 4: Polish & Refinements ✅

This phase adds professional polish and UX improvements:

- ✅ **Interactive Area Picker** - Full-screen map with tap-to-set and radius slider
- ✅ **Haptic Feedback** - Tactile responses throughout (light/medium/heavy/success/warning/error)
- ✅ **Unread Message Badge** - Red badge with count on chat button
- ✅ **Better Error Messages** - User-friendly, specific error messages
- ✅ **Enhanced UX** - Improved alerts, loading states, and feedback

### New Components

- `components/AreaPicker.tsx` - Interactive map-based area selector
- `lib/haptics.ts` - Cross-platform haptic feedback utilities

### Key Improvements

**Interactive Area Picker:**
- Tap map to set center point
- Slider for radius (100m - 5km)
- "Use My Location" button
- Live circle preview
- Edit existing areas

**Haptic Feedback:**
- Button taps, selections, role changes
- Success/error/warning contextual feedback
- Catch attempts and results
- New message notifications
- Reveal timer alerts

**UX Polish:**
- Unread count badge on chat (💬 3)
- Formatted distances (1.5km vs 1500m)
- Specific error messages with suggestions
- Haptic + visual feedback
- Professional feel

**See [PHASE4_COMPLETE.md](./PHASE4_COMPLETE.md) for detailed guide.**

## Next Steps (Optional)

The game is now **feature-complete and production-ready**! 🎉

Optional future enhancements:
- **Phase 5**: Advanced features
  - Game history & stats
  - Player profiles & avatars
  - Multiple game modes
  - Power-ups
  - Sound effects
  - Animations & transitions
  - Dark mode
  - Achievements & leaderboards

## Architecture Notes

### Room Management

Rooms are stored in memory with the following lifecycle:
- Created when host calls `createRoom`
- Players can join in LOBBY status
- Transitions to IN_PROGRESS when host starts
- Ends when all thieves captured or host ends
- Deleted when last player leaves

### Player Tracking

Each player has:
- Unique UUID generated server-side
- Socket ID for real-time communication
- Location updated at max 1 Hz
- Out-of-bounds status tracked automatically
- Role (Police/Thief) selected in lobby

## License

ISC

