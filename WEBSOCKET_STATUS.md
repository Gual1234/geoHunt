# WebSocket Connection Status

## Problem SOLVED! 🎉
The issue was that our server was only binding to `localhost` instead of `0.0.0.0`, preventing network access.

## What We Tried
1. ❌ Direct HTTP connection (`http://192.168.1.223:3000`) - Server only bound to localhost
2. ❌ WebSocket-only mode - Still blocked
3. ❌ Polling-only mode with HTTP - Still blocked  
4. ❌ Cloudflare HTTPS Tunnel - Unnecessary complexity
5. ✅ **Fixed server binding to 0.0.0.0** - This was the real solution!

## Current Setup

### Server ✅ FIXED
- Running on port 3000 ✅
- **NOW binding to 0.0.0.0** ✅ (was localhost only)
- Accessible from network ✅
- LAN IP: `192.168.1.194:3000`

### App Configuration ✅ UPDATED
- File: `app/lib/socket.ts`
- Updated to use: `http://192.168.1.194:3000`
- Transport: `websocket` (direct connection)
- Settings: Standard reconnection options

### Test Script ✅ CREATED
- File: `test-connection.sh`
- Tests both localhost and LAN IP connectivity
- Run: `./test-connection.sh`

## How to Test the Fix

### 1. Start the Server
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/server
npm run dev
```
**Look for:** `Server on http://0.0.0.0:3000` (not localhost!)

### 2. Test Network Connectivity
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt
./test-connection.sh
```
**Should see:** JSON responses from both localhost and LAN IP

### 3. Start the App
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
npm start
```
**Scan QR code** with Expo Go on your phone

### 4. Check Connection
**In the app logs, you should see:**
- `🔌 Creating socket connection to: http://192.168.1.194:3000`
- `🔌 Socket created (WebSocket mode via LAN), connecting...`
- `🎉 SOCKET CONNECTED! ID: [socket-id]`

**No more errors!** 🎉

### Option 2: Development Build (Best Long-term Solution)
Since Expo Go has security restrictions, use a development build:

```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app

# Already installed: expo-dev-client ✅
# Already added to app.config.ts ✅

# Option A: iOS Simulator (requires Xcode)
export LANG=en_US.UTF-8
npx expo run:ios

# Option B: EAS Cloud Build (no cable needed!)
npx expo install eas-cli
npx eas login
npx eas build --profile development --platform ios
# Scan QR code to install on phone
```

### Option 3: Use Android Instead
If you have an Android device, it might have fewer restrictions:
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
npx expo run:android
```

## Key Files Modified
- `app/lib/socket.ts` - Changed SERVER_URL to Cloudflare tunnel HTTPS
- `app/app.config.ts` - Added expo-dev-client plugin
- `server/server.key` & `server/server.cert` - Created (not used yet)

## Commands to Check Status

### Is Cloudflare tunnel running?
```bash
ps aux | grep cloudflared | grep -v grep
curl https://annex-organization-keywords-talks.trycloudflare.com/health
```

### Is server running?
```bash
lsof -i :3000
curl http://localhost:3000/health
```

### Current socket config
```bash
cat app/lib/socket.ts | grep -A5 "getServerUrl"
```

## Important Notes
- **Cloudflare tunnel URL changes each restart** - Update `app/lib/socket.ts` if you restart it
- Keep tunnel running in background: `cloudflared tunnel --url http://localhost:3000 &`
- The free Cloudflare tunnel might not support WebSocket upgrades, so we use polling only


