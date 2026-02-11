#!/bin/bash

# Fix Mapbox token and clear Next.js cache

echo "🔧 Fixing Mapbox token..."

WEB_ENV="apps/web/.env.local"
NEXT_CACHE="apps/web/.next"

# Check if token is provided as argument
if [ -n "$1" ]; then
    TOKEN="$1"
    echo "Using provided token..."
elif [ -f ".env" ]; then
    TOKEN=$(grep "^NEXT_PUBLIC_MAPBOX_TOKEN=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ "$TOKEN" = "pk.your-mapbox-token-here" ] || [ -z "$TOKEN" ]; then
        echo "❌ Token in root .env is still placeholder"
        echo "Please provide your Mapbox token:"
        echo "  ./scripts/fix-mapbox.sh pk.eyJ1Ijoi...your-token"
        exit 1
    fi
    echo "Using token from root .env..."
else
    echo "❌ No token found. Usage:"
    echo "  ./scripts/fix-mapbox.sh pk.eyJ1Ijoi...your-token"
    exit 1
fi

# Update .env.local
mkdir -p "$(dirname "$WEB_ENV")"
if [ -f "$WEB_ENV" ]; then
    # Update existing file
    if grep -q "^NEXT_PUBLIC_MAPBOX_TOKEN=" "$WEB_ENV"; then
        sed -i '' "s|^NEXT_PUBLIC_MAPBOX_TOKEN=.*|NEXT_PUBLIC_MAPBOX_TOKEN=$TOKEN|" "$WEB_ENV"
    else
        echo "NEXT_PUBLIC_MAPBOX_TOKEN=$TOKEN" >> "$WEB_ENV"
    fi
else
    # Create new file
    echo "NEXT_PUBLIC_MAPBOX_TOKEN=$TOKEN" > "$WEB_ENV"
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> "$WEB_ENV"
fi

echo "✅ Updated $WEB_ENV"

# Clear Next.js cache
if [ -d "$NEXT_CACHE" ]; then
    rm -rf "$NEXT_CACHE"
    echo "✅ Cleared Next.js cache"
fi

echo ""
echo "✅ Done! Restart your dev server (pnpm dev) for changes to take effect"
echo "   The map should work after restart"
