#!/bin/bash

# Quick Stripe Configuration Checker

echo "🔍 Checking Stripe Configuration..."
echo ""

# Check API env
API_ENV="apps/api/.env.local"
if [ -f "$API_ENV" ]; then
    echo "✅ Found $API_ENV"
    
    if grep -q "STRIPE_SECRET_KEY=sk_" "$API_ENV"; then
        echo "   ✅ STRIPE_SECRET_KEY is set"
    else
        echo "   ❌ STRIPE_SECRET_KEY not found or invalid"
    fi
    
    if grep -q "STRIPE_WEBHOOK_SECRET=whsec_" "$API_ENV"; then
        echo "   ✅ STRIPE_WEBHOOK_SECRET is set"
    else
        echo "   ❌ STRIPE_WEBHOOK_SECRET not found or invalid"
    fi
else
    echo "❌ $API_ENV not found"
    echo "   Create it with: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET"
fi

echo ""

# Check Web env
WEB_ENV="apps/web/.env.local"
if [ -f "$WEB_ENV" ]; then
    echo "✅ Found $WEB_ENV"
    
    if grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_" "$WEB_ENV"; then
        echo "   ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set"
    else
        echo "   ❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found or invalid"
    fi
else
    echo "❌ $WEB_ENV not found"
    echo "   Create it with: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
fi

echo ""

# Check Stripe CLI
if command -v stripe &> /dev/null; then
    echo "✅ Stripe CLI is installed"
    
    if stripe config --list &> /dev/null; then
        echo "   ✅ Stripe CLI is logged in"
    else
        echo "   ⚠️  Stripe CLI not logged in (run: stripe login)"
    fi
else
    echo "❌ Stripe CLI not installed"
    echo "   Install with: brew install stripe/stripe-cli/stripe"
fi

echo ""
echo "📖 For full setup instructions, see: STRIPE_SETUP.md"
