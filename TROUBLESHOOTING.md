# GeoHunt - Troubleshooting Guide

## Current Issue: Module Resolution Error

**Error:** `Unable to resolve "../types" from "app/summary.tsx"`

### What We've Tried:
1. ✅ Updated `tsconfig.json` with `@/types` path alias
2. ✅ Updated `babel.config.js` with `@/types` path alias
3. ✅ Created `metro.config.js` to watch parent directory
4. ✅ Changed all imports from `@/types/types` to `@/types`
5. ✅ Cleared Metro bundler cache with `--clear` flag
6. ✅ Removed missing asset references from `app.json`

### Files Modified:
- `/app/tsconfig.json` - Added path alias: `"@/types": ["../shared/types.ts"]`
- `/app/babel.config.js` - Added path alias: `'@/types': '../shared/types.ts'`
- `/app/metro.config.js` - Created to watch parent directory
- `/app/app.json` - Removed missing asset references

### Potential Solutions to Try:

#### Option 1: Use Direct Relative Imports (Quick Fix)
Instead of using `@/types`, change all imports to use relative paths:
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from '@/types'|from '../../shared/types'|g"
```

Then update based on each file's depth (app/* needs `../../shared/types`, components/* needs `../shared/types`, etc.)

#### Option 2: Move types.ts into app directory
```bash
cp /Users/gualberto/Desktop/Projects/geo-hunt/shared/types.ts /Users/gualberto/Desktop/Projects/geo-hunt/app/types.ts
```

Then update all imports:
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from '@/types'|from '@/types'|g"
```

And update `babel.config.js`:
```javascript
'@/types': './types.ts'
```

#### Option 3: Verify babel-plugin-module-resolver
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
npm ls babel-plugin-module-resolver
# If missing:
npm install --save-dev babel-plugin-module-resolver
```

#### Option 4: Complete Clean Reinstall
```bash
cd /Users/gualberto/Desktop/Projects/geo-hunt/app
rm -rf node_modules .expo
npm install
npm start -- --clear
```

### To Start Fresh When You Return:

1. **Stop all processes**
   ```bash
   pkill -9 -f "expo|Metro|node"
   ```

2. **Start Server**
   ```bash
   cd /Users/gualberto/Desktop/Projects/geo-hunt/server
   npm run dev
   ```

3. **Start Client**
   ```bash
   cd /Users/gualberto/Desktop/Projects/geo-hunt/app
   npm start -- --clear
   ```

### Current File Structure:
```
geo-hunt/
├── shared/
│   └── types.ts          # Shared types file
├── server/
│   └── src/
│       └── index.ts
└── app/
    ├── babel.config.js   # Path alias configured
    ├── metro.config.js   # Watches parent dir
    ├── tsconfig.json     # Path alias configured
    └── app/
        └── *.tsx         # Using @/types imports
```

### Next Steps:
The most reliable solution would be **Option 1** (use relative imports) or **Option 2** (copy types into app directory). The path alias approach with babel-plugin-module-resolver sometimes has issues with Expo Metro bundler.

---

## ✅ FIXED!

**Solution Applied:** Copied `shared/types.ts` to `app/types.ts`

**Changes Made:**
1. Copied `/shared/types.ts` → `/app/types.ts`
2. Updated `babel.config.js` - Changed `'@/types': './types'`
3. Updated `tsconfig.json` - Changed `"@/types": ["./types"]`
4. Removed `metro.config.js` (no longer needed)
5. Cleared all caches (`.expo`, `node_modules/.cache`)

**Note:** The `app/types.ts` file is now a copy. If you update `shared/types.ts`, you'll need to copy it again, OR set up a build script to sync them.

---

*Last updated: Fixed by moving types into app directory*


