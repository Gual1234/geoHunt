#!/bin/bash

echo "🧹 Clearing all caches..."

cd /Users/gualberto/Desktop/Projects/geo-hunt/app

# Remove all cache directories
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro

# Clear watchman if available
if command -v watchman &> /dev/null; then
  echo "🔍 Clearing watchman..."
  watchman watch-del-all 2>/dev/null || true
fi

echo ""
echo "✅ Caches cleared!"
echo ""
echo "🚀 Starting Expo with fresh cache..."
echo ""

# Start with all cache clearing flags
npx expo start --clear --reset-cache

# Alternatively, use: npx expo start --clear --reset-cache --go
# to auto-open in Expo Go













