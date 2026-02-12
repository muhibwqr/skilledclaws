# Railway Deployment Guide

This guide walks you through deploying the SkilledClaws API to Railway.

## Prerequisites

1. **Railway account**: Sign up at [railway.app](https://railway.app)
2. **GitHub repository**: Your code should be pushed to GitHub
3. **Environment variables**: Have your API keys ready (see below)

## Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Connect Repository**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `skilledclaws` repository

2. **Configure Service**
   - Railway will auto-detect it's a Node.js project
   - **Root Directory**: Leave as root (monorepo)
   - **Build Command**: `pnpm install && pnpm --filter @skilledclaws/api build`
   - **Start Command**: `cd apps/api && node dist/index.js`

3. **Set Environment Variables**
   - Go to your service → Variables tab
   - Add all required variables (see below)

4. **Deploy**
   - Railway will automatically build and deploy
   - Get your API URL from the service settings

### Option 2: Use Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project or create new
railway link

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set SUPABASE_URL=https://...
# ... (see full list below)

# Deploy
railway up
```

## Environment Variables

Set these in Railway Dashboard → Your Service → Variables:

### Required

```bash
# OpenAI (for embeddings and AI generation)
OPENAI_API_KEY=sk-...

# Supabase (database and storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=skills

# Port (Railway sets this automatically, but you can override)
PORT=3001
```

### Optional (but recommended)

```bash
# Frontend URL for CORS (set after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app

# Stripe (for payments - optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (for rate limiting - optional)
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...

# Cloudflare R2 (alternative to Supabase storage - optional)
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...
```

## Railway Configuration

The `railway.json` file in the root configures:
- **Build**: Installs dependencies and builds the API
- **Start**: Runs the compiled API from `apps/api/dist/index.js`

Railway will automatically:
- Detect Node.js version (requires >=20.0.0)
- Use pnpm (detected from `packageManager` in package.json)
- Build the monorepo workspace package

## Build Process

Railway will:
1. Install dependencies: `pnpm install`
2. Build API: `pnpm --filter @skilledclaws/api build`
3. Start server: `cd apps/api && node dist/index.js`

The build outputs to `apps/api/dist/` directory.

## Verifying Deployment

1. **Check Logs**
   - Railway Dashboard → Your Service → Logs
   - Look for: `API running at http://0.0.0.0:3001`
   - Check for environment variable warnings

2. **Test Health Endpoint**
   ```bash
   curl https://your-api.railway.app/
   ```
   Should return: `{"name":"skilledclaws-api","status":"ok"}`

3. **Test Generate Endpoint**
   ```bash
   curl -X POST https://your-api.railway.app/api/generate \
     -H "Content-Type: application/json" \
     -d '{"skillName":"test"}'
   ```

## Custom Domain (Optional)

1. Go to Railway Dashboard → Your Service → Settings
2. Click "Generate Domain" or "Add Custom Domain"
3. Railway provides: `your-service.railway.app`
4. Use this URL as your `VITE_API_URL` in the frontend

## Troubleshooting

### Build Fails

**Error**: `Cannot find module '@skilledclaws/skills-engine'`
- **Fix**: Ensure `pnpm install` runs at root (monorepo workspace)

**Error**: `TypeScript compilation errors`
- **Fix**: Check `apps/api/tsconfig.json` paths are correct
- Run `pnpm type-check` locally first

### Runtime Errors

**Error**: `[ENV] OpenAI NOT configured`
- **Fix**: Set `OPENAI_API_KEY` in Railway variables

**Error**: `[ENV] Supabase not configured`
- **Fix**: Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Error**: `Port already in use`
- **Fix**: Railway sets `PORT` automatically, don't override unless needed

### CORS Errors

**Error**: Frontend can't reach API
- **Fix**: Set `FRONTEND_URL` in Railway variables to your Vercel domain
- Redeploy after setting the variable

## Cost

Railway pricing:
- **Starter**: $5/month (512MB RAM, 1GB storage)
- **Developer**: $20/month (2GB RAM, 5GB storage)
- **Pro**: $50/month (4GB RAM, 10GB storage)

For this API, **Starter ($5/month)** should be sufficient for moderate traffic.

## Next Steps

After deploying:
1. ✅ Get your Railway API URL
2. ✅ Set `FRONTEND_URL` in Railway (after frontend is deployed)
3. ✅ Update frontend repo with `VITE_API_URL=https://your-api.railway.app`
4. ✅ Test the connection

See [FRONTEND_CONNECTION.md](./FRONTEND_CONNECTION.md) for connecting the frontend.
