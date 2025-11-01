# Phase 4 - Quick Start Guide

## 🎨 What's New

Phase 4 adds **polish and professional UX** to make the app feel complete!

### 3 Major Features

1. **Interactive Area Picker** 🗺️ - Full map interface to set game boundaries
2. **Haptic Feedback** 📳 - Tactile responses for all interactions
3. **Unread Chat Badge** 💬 - Never miss a message

---

## 🚀 Run It

```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd app
npm install  # Install expo-haptics
npm start
```

Press `i` (iOS) or `a` (Android) - **Use physical device for haptics!**

---

## 🧪 Test the Features

### 1. Interactive Area Picker

**Steps:**
1. Create room → Go to lobby (as host)
2. Tap "Set Area"
3. Map opens full-screen
4. Tap anywhere → Circle moves there
5. Drag slider → Circle size changes
6. Tap "Use My Location" → Centers on you
7. Set radius to 2km
8. Tap "Set Area" → Saves

**Result:**
- See "✅ Area set (2.0km radius)"
- All players see updated area
- Can tap "Change Area" to edit

### 2. Haptic Feedback

**⚠️ Physical device required** (doesn't work in simulator)

**Test haptics:**
| Action | Feel |
|--------|------|
| Tap "Create Game" | Light tap |
| Select role | Click |
| Start game (success) | Double-tap |
| Start game (error) | Strong buzz |
| New chat message | Subtle tap |
| Reveal starts | Alert buzz |
| Catch success | Celebration tap |
| Catch fail | Error buzz |

### 3. Unread Messages Badge

**Steps:**
1. Start game with 2 devices
2. Device 1: Close chat
3. Device 2: Send "Hello"
4. Device 1: See 💬 1 (red badge)
5. Device 2: Send "How are you?"
6. Device 1: Badge updates to 💬 2
7. Device 1: Open chat → Badge disappears
8. Device 1: Close chat
9. Device 2: Send message
10. Device 1: 💬 1 appears again

---

## 📊 Before vs After

| Feature | Phase 3 | Phase 4 |
|---------|---------|---------|
| Area setting | Hardcoded demo | Interactive map |
| Feedback | Visual only | Visual + haptic |
| Errors | Generic | User-friendly |
| Chat | Can miss messages | Unread badge |
| Feel | Functional | Professional |

---

## 🎯 Quick Comparison

### Setting Game Area

**Phase 3:**
```
Tap "Set Area (Demo)"
→ Uses hardcoded San Francisco
→ Can't customize
```

**Phase 4:**
```
Tap "Set Area"
→ Opens full map
→ Tap location + adjust radius
→ Live preview
→ Save custom area
```

### Error Messages

**Phase 3:**
- "Failed to join room"
- "Room not found"

**Phase 4:**
- "Room not found. Check the code and try again."
- "This game has already started."
- + Error haptic feedback

### Chat Experience

**Phase 3:**
- Messages appear
- Easy to miss
- No indication

**Phase 4:**
- Messages appear
- Red badge with count (💬 3)
- Haptic notification
- Badge until read

---

## 🔧 New Dependencies

Phase 4 adds one new package:

```json
"expo-haptics": "~12.8.0"
```

Already in package.json! Just run `npm install`

---

## 💡 Tips

**Haptics:**
- Only work on physical devices
- Won't feel anything in simulator
- Check device haptic settings if no feedback

**Area Picker:**
- Permission required for "Use My Location"
- Can still set by tapping map without permission
- Circle shows live preview

**Unread Badge:**
- Only counts messages while chat closed
- Resets on app reload (session-based)
- Light haptic for each message (not spammy)

---

## ✅ Success Checklist

- [ ] Area picker opens with map
- [ ] Can set center by tapping
- [ ] Can adjust radius with slider
- [ ] Area syncs to all clients
- [ ] Feel haptic feedback (physical device)
- [ ] Unread badge shows count
- [ ] Badge resets when chat opened
- [ ] Error messages are clear

---

## 🎉 Result

**Professional, Polished Game!**

✨ Interactive area selection
📳 Haptic feedback everywhere
💬 Never miss chat messages
🎯 Clear error messages
🚀 Production-ready UX

For detailed docs, see [PHASE4_COMPLETE.md](./PHASE4_COMPLETE.md)
















