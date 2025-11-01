#!/bin/bash
# Sync shared types to app directory

echo "🔄 Syncing types from shared/ to app/..."

cp shared/types.ts app/types.ts

if [ $? -eq 0 ]; then
  echo "✅ Types synced successfully!"
else
  echo "❌ Failed to sync types"
  exit 1
fi















