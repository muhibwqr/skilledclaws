#!/bin/bash

# Stripe Setup Script
# This script helps you set up Stripe for local development

echo "🔧 Stripe Setup for SkilledClaws"
echo "================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
fi

echo "✅ Stripe CLI found"
echo ""

# Check if user is logged in
if ! stripe config --list &> /dev/null; then
    echo "📝 You need to login to Stripe CLI first:"
    echo "   Run: stripe login"
    echo ""
    read -p "Press Enter after you've logged in..."
fi

echo "🚀 Starting webhook forwarding..."
echo ""
echo "This will forward Stripe webhooks to: http://localhost:3001/api/webhooks/stripe"
echo ""
echo "⚠️  IMPORTANT: Copy the webhook signing secret (whsec_...) that gets printed"
echo "   and add it to apps/api/.env.local as: STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "Press Ctrl+C to stop webhook forwarding"
echo ""

# Start webhook forwarding
stripe listen --forward-to localhost:3001/api/webhooks/stripe
