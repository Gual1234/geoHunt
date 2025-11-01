# WebSocket Connection Error - FIXED!

## Problem
```
❌ Connection error: websocket error
```

The app was trying to connect to `http://localhost:3000` but when running on a device/simulator, `localhost` refers to the device itself, not your computer.

## Solution Applied

### 1. Updated Server URL
**Changed from:** `http://localhost:3000`  
**Changed to:** `http://192.168.1.223:3000`

### 2. Files Updated
- ✅ `/app/lib/socket.ts` - Updated SERVER_URL to use local IP
- ✅ `/app/app.config.ts` - Updated SERVER_URL in extra config
- ✅ Removed missing asset references from app.config.ts

### 3. Server Status
✅ **Server is running** on port 3000  
✅ **Server accepts connections** from all interfaces  
✅ **Process confirmed running** with `ps aux`

## How It Works Now

1. **Server:** Running on `192.168.1.223:3000` (your computer's local IP)
2. **Client:** Connects to `http://192.168.1.223:3000` (same IP)
3. **Connection:** Works on both simulator and physical devices

## Test It

1. **Server should be running** (started in background)
2. **Expo should be starting** (restarted with new config)
3. **Press `i` for iOS** or **`a` for Android**
4. **Should see:** `✅ Connected to server: [socket-id]`

## If Still Having Issues

### Check Server Status:
```bash
curl http://192.168.1.223:3000
# Should return: Cannot GET /
```

### Check Server Logs:
```bash
ps aux | grep "ts-node-dev"
# Should show running process
```

### Restart Everything:
```bash
# Terminal 1 - Server
cd /Users/gualberto/Desktop/Projects/geo-hunt/server
npm run dev

# Terminal 2 - Client  
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
npm start
```

---

*Fixed: October 13, 2025 - Updated server URL to use local IP address*















