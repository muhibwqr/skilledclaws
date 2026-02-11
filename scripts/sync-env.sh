#!/bin/bash

# Sync environment variables from root .env to app-specific .env.local files

ROOT_ENV=".env"
WEB_ENV="apps/web/.env.local"
API_ENV="apps/api/.env.local"

echo "🔄 Syncing environment variables..."

if [ ! -f "$ROOT_ENV" ]; then
    echo "❌ Root .env file not found"
    exit 1
fi

# Sync web env vars
if [ -f "$ROOT_ENV" ]; then
    echo "📝 Syncing web environment variables..."
    mkdir -p "$(dirname "$WEB_ENV")"
    
    # Extract NEXT_PUBLIC_* vars from root .env
    grep "^NEXT_PUBLIC_" "$ROOT_ENV" > "$WEB_ENV" 2>/dev/null || true
    
    if [ -s "$WEB_ENV" ]; then
        echo "✅ Synced to $WEB_ENV"
    else
        echo "⚠️  No NEXT_PUBLIC_* vars found in root .env"
    fi
fi

# Sync API env vars (non-NEXT_PUBLIC)
if [ -f "$ROOT_ENV" ]; then
    echo "📝 Syncing API environment variables..."
    mkdir -p "$(dirname "$API_ENV")"
    
    # Extract non-NEXT_PUBLIC vars from root .env
    grep -v "^NEXT_PUBLIC_" "$ROOT_ENV" | grep -v "^#" | grep "=" > "$API_ENV" 2>/dev/null || true
    
    if [ -s "$API_ENV" ]; then
        echo "✅ Synced to $API_ENV"
    else
        echo "⚠️  No API vars found in root .env"
    fi
fi

echo ""
echo "✅ Sync complete!"
echo "⚠️  Note: Next.js needs a restart to pick up new env vars"
