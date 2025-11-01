# GeoHunt 🏃‍♂️

A real-time multiplayer location-based mobile game where players compete as **Police 👮** or **Thieves 🥷** in an outdoor hide-and-seek experience.

## 🎮 About the Game

GeoHunt is a location-based multiplayer game that transforms your real-world location into a game arena. Players form teams of Police and Thieves, and compete in a dynamic cat-and-mouse chase using GPS tracking.

### Gameplay

- **Police** must hunt down and catch all Thieves within a specified game area
- **Thieves** must evade capture and survive until time runs out
- Every 2 minutes, all Thieves are revealed to Police for 5 seconds
- Thieves have a real-time radar showing distance to the nearest Police
- Catch attempts require Police to be within 50 meters of a Thief

### Features

- ✅ Real-time location tracking with GPS
- ✅ Interactive map-based game area selection
- ✅ Periodic reveal system (2-minute intervals)
- ✅ Distance-based threat radar for Thieves
- ✅ In-game chat system
- ✅ Haptic feedback for enhanced gameplay
- ✅ Bonus areas for Thieves
- ✅ Configurable game duration
- ✅ Cross-platform (iOS & Android)

## 🛠 Tech Stack

### Frontend
- **React Native** with **Expo** - Mobile app framework
- **TypeScript** - Type-safe development
- **Socket.IO Client** - Real-time WebSocket communication
- **React Native Maps** - Interactive map display
- **Zustand** - State management
- **Expo Router** - Navigation
- **Expo Location** - GPS tracking
- **Expo Haptics** - Tactile feedback

### Backend
- **Node.js** with **TypeScript** - Server runtime
- **Express** - HTTP server
- **Socket.IO** - WebSocket server for real-time communication
- **In-memory store** - Room and game state management

### Infrastructure
- **Fly.io** - Server deployment
- **EAS Update** - OTA mobile app updates
- **Docker** - Containerization

## 📁 Project Structure

```
geo-hunt/
├── app/              # React Native mobile app (Expo)
├── server/           # Node.js backend server
├── shared/           # Shared TypeScript types
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Expo CLI** (install globally: `npm install -g expo-cli`)
- Physical device or emulator for testing

### Server Setup

1. **Navigate to server directory:**
```bash
cd server
npm install
```

2. **Run the development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

**Production:** The server is deployed on Fly.io at `https://geohunt-server.fly.dev`

### Client Setup

1. **Navigate to app directory:**
```bash
cd app
npm install
```

2. **Set up environment (optional for local dev):**
Create `.env` file in `/app`:
```env
SERVER_URL=http://localhost:3000
```

3. **Start Expo development server:**
```bash
npm start
```

4. **Run on device:**
- **iOS Simulator:** Press `i` in terminal
- **Android Emulator:** Press `a` in terminal  
- **Physical Device:** Scan QR code with Expo Go app

### Sync Types

If you modify types in `/shared/types.ts`, sync them to the app:
```bash
./sync-types.sh
```

## 🎯 How to Play

### Lobby Phase

1. **Host creates a room** - Receives a 6-character room code
2. **Players join** - Enter room code to join
3. **Select roles** - Choose Police or Thief
4. **Set game area** - Host picks location and radius (100m - 5km)
5. **Optional:** Set game duration (5-30 minutes or unlimited)
6. **Start game** - Host begins the match

### Game Phase

**For Police:**
- See countdown timer until next reveal (every 2 minutes)
- During reveal: See all Thief positions on map (static snapshot)
- Catch button appears when within 50m of a Thief
- Tap catch to attempt capture (server validates distance)

**For Thieves:**
- Real-time radar shows distance to nearest Police
- Color-coded threat levels:
  - 🟢 Green (≥200m) - Safe
  - 🟡 Yellow (200-100m) - Caution
  - 🟠 Orange (100-50m) - Close!
  - 🔴 Red (<50m) - DANGER!
- Enter bonus areas for temporary reveals

**For Everyone:**
- Live location updates (1 Hz)
- In-game chat
- Game timer (if duration set)
- Out-of-bounds detection

### End Phase

- Game ends when all Thieves are caught
- Host can manually end game
- Summary screen shows game statistics

## 📡 API & Events

### Key Socket.IO Events

**Client → Server:**
- `createRoom` - Create new game room
- `joinRoom` - Join existing room
- `selectRole` - Choose Police or Thief
- `updateArea` - Set game boundaries (host only)
- `startGame` - Begin match (host only)
- `locationUpdate` - Send GPS coordinates
- `catchAttempt` - Try to catch a Thief
- `chatMessage` - Send message

**Server → Client:**
- `roomState` - Room state updates
- `revealState` - Thief reveal notifications
- `locationUpdate` - Player location broadcasts
- `playerCaught` - Capture events
- `chatMessage` - Chat broadcasts
- `gameEnd` - Game over event

## 🏗 Architecture

### Room Management
- Rooms stored in-memory with 6-character codes
- Lifecycle: `LOBBY` → `IN_PROGRESS` → `ENDED`
- Auto-cleanup when empty

### Real-time Communication
- WebSocket-based using Socket.IO
- Rate-limited location updates (1 Hz per player)
- Server-side validation for all game actions

### Distance Calculation
- Haversine formula for accurate GPS distance
- 50m catch radius validation
- Out-of-bounds detection

## 📱 Deployment

### Server (Fly.io)
```bash
cd server
fly deploy
```

### Client (EAS Update)
```bash
cd app
npx eas update --branch production --message "Your update message"
```

## 📄 License

ISC

---

**Built with ❤️ using React Native, Node.js, and Socket.IO**
