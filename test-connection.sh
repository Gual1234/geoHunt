#!/bin/bash

echo "🧪 Testing server connectivity..."
echo ""

# Test localhost
echo "1️⃣ Testing localhost:3000"
curl -s http://localhost:3000/health || echo "❌ localhost failed"

echo ""
echo "2️⃣ Testing LAN IP: 192.168.1.194:3000"
curl -s http://192.168.1.194:3000/health || echo "❌ LAN IP failed"

echo ""
echo "3️⃣ Testing rooms endpoint"
curl -s http://192.168.1.194:3000/rooms || echo "❌ Rooms endpoint failed"

echo ""
echo "✅ If you see JSON responses above, the server is accessible!"
echo "📱 Your phone should be able to connect to: http://192.168.1.194:3000"












