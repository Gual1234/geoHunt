# GeoHunt Deployment Guide

## ✅ Server Successfully Deployed to Fly.io!

**Server URL:** `https://geohunt-server.fly.dev`

### Quick Status Check
```bash
curl https://geohunt-server.fly.dev/health
# Should return: {"status":"ok","timestamp":...}
```

## How It Works

### Prerequisites
- Fly.io CLI installed (`flyctl`)
- Fly.io account (you already have one!)

### Deployment Steps (Already Completed!)

1. **Login to Fly.io**
   ```bash
   cd server
   flyctl auth login
   ```

2. **Deploy the server**
   ```bash
   flyctl deploy
   ```

3. **The app automatically switches based on environment:**
   - **Development mode (`__DEV__` = true):** Uses LAN IP `192.168.1.194:3000`
   - **Production mode (`__DEV__` = false):** Uses `https://geohunt-server.fly.dev`

### Redeploying After Changes

```bash
cd server
flyctl deploy
```

### Environment Variables
The server automatically uses these production settings:
- `NODE_ENV=production`
- `PORT=3000`
- `HOST=0.0.0.0`

### Testing
1. **Test server health**
   ```bash
   curl https://your-app-name.fly.dev/health
   ```

2. **Build production app**
   ```bash
   cd app
   npx expo build:android  # or expo build:ios
   ```

3. **Install on device and test remotely**

### Local Development vs Production
- **Development**: Uses LAN IP (`192.168.1.194:3000`)
- **Production**: Uses Fly.io URL (`https://your-app.fly.dev`)
- The app automatically detects the environment using `__DEV__`

### Troubleshooting
- Check Fly.io logs: `flyctl logs`
- Restart app: `flyctl restart`
- Scale up if needed: `flyctl scale count 1`

### Cost
- Fly.io free tier: 3 shared-cpu-1x 256mb VMs
- Should be free for testing!
