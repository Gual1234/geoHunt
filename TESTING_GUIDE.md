# Testing Guide - Map Markers Issue SOLVED ✅

## Root Cause Found!

The map markers weren't showing because:

1. ✅ **Location tracking works** - Client gets location and sends to server
2. ✅ **Game starts successfully** - Server changes status to `IN_PROGRESS`
3. ❌ **Socket mapping lost on server restart** - Server forgets which socket belongs to which player

## The Issue

When the server restarts:
- Client socket automatically reconnects ✅
- BUT client doesn't re-join the room ❌
- Server receives location updates from unknown socket ❌
- Location update rejected: `❌ Location update: No playerId for socket`

## How to Test Successfully

### Option 1: Keep Server Running (Recommended for Testing)
```bash
# Terminal 1: Start server ONCE
cd server
npm run dev

# Terminal 2: Start app
cd app
npm start

# Don't restart the server while testing!
# If you change server code, you'll need to reload the app too
```

### Option 2: Reload App After Server Restart
If server restarts:
1. Force close Expo Go on phone
2. Reopen and scan QR code again
3. Go through flow: Create room → Select role → Set area → Start game

## Proper Testing Flow

1. **Start server** (keep it running)
2. **Start app** and scan QR
3. **Create room** or join existing
4. **Select role** (Police or Thief)
5. **Set game area** (tap map icon, drag to location, adjust radius)
6. **Press "Start Game"** ✅
7. **Game starts** - you'll see:
   - Server log: `✅ Game started in room XXX!`
   - App navigates to game screen
   - Location tracking starts
   - Server log: `📍 Location accepted for player...`
   - **Your marker appears on map!** 👮 or 🥷

## Expected Server Logs (Successful Flow)

```
Socket connected: ABC123
Room created: ROOM01 by Player1
Player selected role POLICE
Area updated for room ROOM01
🎮 Attempting to start game in room ROOM01...
   Status: LOBBY, Area: true, Players with roles: 1/1
✅ Game started in room ROOM01!
📍 Location accepted for player XXX: (57.7175, 12.0257)
📍 Location accepted for player XXX: (57.7175, 12.0257)
```

## What You'll See

### ✅ On Phone
- Custom emoji marker: 👮 for police, 🥷 for thieves
- "YOU" badge under your marker
- Game area circle (blue)
- Map centered on game area

### ✅ In Client Logs
```
🔐 Requesting location permissions...
🔐 Permission status: granted
✅ Location permission granted, starting tracking...
📍 Location update: {lat: ..., lng: ...}
📤 Sending location to server: {...}
🗺️ MAP DEBUG:
  - Visible players count: 1
  - All players: [{"hasLocation": true, "location": {...}, ...}]
```

## Troubleshooting

### Markers Still Not Showing?
1. Check server logs for `❌ Location update: No playerId for socket`
   - **Fix:** Reload app (force close Expo Go and reopen)

2. Check for `⚠️ Location update rejected: Game status is LOBBY`
   - **Fix:** Press "Start Game" in lobby

3. Check client logs for `"hasLocation": false`
   - **Fix:** Ensure game is started (not just on game screen)

### Testing with Multiple Players
- Use multiple devices or Expo Go + simulator
- Each player needs to join same room code
- All players select roles before starting
- Host presses "Start Game"

## Known Limitations (Testing Phase)

- ⚠️ **No automatic reconnection** - If server restarts, reload app
- ⚠️ **Single player testing** - Can test alone, but game designed for 2+
- ⚠️ **No persistence** - Rooms are in-memory, lost on server restart

## Next Steps (Not Yet Implemented)

- [ ] Automatic room rejoin on reconnect
- [ ] Persistent storage (Redis/Database)
- [ ] Better error messages for connection issues
- [ ] Reconnection retry logic












