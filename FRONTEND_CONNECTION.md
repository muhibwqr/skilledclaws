# Frontend Connection Guide

This document explains how to connect the [skilledclawsfrontend](https://github.com/muhibwqr/skilledclawsfrontend) repository to this API.

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────┐
│  Frontend Repo              │  ────>  │  This Repo (API)     │
│  (skilledclawsfrontend)      │  API    │  (skilledclaws)      │
│  Deployed on Vercel         │  Calls  │  Deployed on Railway │
│  https://your-app.vercel.app│         │  https://api...      │
└─────────────────────────────┘         └──────────────────────┘
```

## How They Connect

The frontend and API are **completely separate** - they communicate over HTTP using environment variables and CORS.

### 1. Frontend Setup (skilledclawsfrontend repo)

#### Environment Variables

In your Vercel dashboard (or `.env.local` for local dev):

```bash
# Production (after API is deployed)
VITE_API_URL=https://your-api.railway.app

# Local dev (leave empty to use Vite proxy)
# VITE_API_URL=
```

#### How Frontend Makes API Calls

The frontend uses `API_BASE` from `src/config.js`:

```javascript
// src/config.js
export const API_BASE = import.meta.env.VITE_API_URL ?? ''
```

Then makes requests like:
```javascript
fetch(`${API_BASE}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ skillName: 'plumbing' })
})
```

#### Vite Proxy (Local Dev)

For local development, the frontend's `vite.config.js` proxies `/api` to `http://localhost:3001`:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

So in dev, you can use `fetch('/api/generate')` and it automatically goes to `localhost:3001`.

### 2. API Setup (This Repo)

#### CORS Configuration

The API is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (legacy Next.js)
- Production frontend URL (set via `FRONTEND_URL` env var)

#### Environment Variables

In Railway (or your deployment platform):

```bash
# Required
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=skills

# Optional (for CORS)
FRONTEND_URL=https://your-app.vercel.app

# Optional (for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## API Endpoints

### POST /api/generate

Generate skills from a single word.

**Request:**
```json
{
  "skillName": "plumbing"
}
```

**Response:**
```json
{
  "success": true,
  "mainSkill": {
    "name": "plumbing",
    "description": "Comprehensive skill pack for plumbing..."
  },
  "subSkills": [
    {
      "id": "uuid",
      "name": "water leak repair",
      "description": "...",
      "triggers": ["fix water leak", ...],
      "strategies": [...],
      "source": "generated"
    },
    ...
  ],
  "skillIds": ["uuid1", "uuid2", ...]
}
```

**Important:** 
- `mainSkill` is always an **object** with `{ name, description }` properties
- `subSkills` is an **array of objects**, each with `{ id, name, description, triggers, strategies, source }`
- Frontend should use `data.mainSkill.name` (not `String(data.mainSkill)`)

**Frontend Usage:**
- Used in `FlowDiagram.jsx` to generate diagram nodes
- Takes first word from input, calls API, displays `mainSkill.name` + `subSkills[].name` as nodes
- **Note:** The frontend code in `FlowDiagram.jsx` line 69 should use `data.mainSkill?.name || data.mainSkill` instead of `String(data.mainSkill)` to properly extract the name

### GET /api/skills

List all skills with pagination.

**Query Parameters:**
- `limit` (default: 100)
- `offset` (default: 0)
- `source` (optional: "generated" | "awesome-claude-skills")

**Response:**
```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "water leak repair",
      "description": "...",
      "triggers": [...],
      "source": "generated",
      "created_at": "2024-01-01T00:00:00Z"
    },
    ...
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

**Frontend Usage:**
- Used in `PastSkillsPage.jsx` to show all generated skills
- Example: `GET /api/skills?limit=200&source=generated`

### GET /api/skills/:id/download

Download a skill file as `.md`.

**Response:**
- Content-Type: `text/markdown`
- Content-Disposition: `attachment; filename="skill-name_SKILL.md"`

**Frontend Usage:**
- Used in `PastSkillsPage.jsx` for download links
- Example: `<a href="${API_BASE}/api/skills/${id}/download">download</a>`

### POST /api/similarity/search

Search skills by text query.

**Request:**
```json
{
  "query": "plumbing repair",
  "limit": 10,
  "source": "generated"  // optional
}
```

**Response:**
```json
{
  "query": "plumbing repair",
  "results": [
    {
      "id": "uuid",
      "name": "water leak repair",
      "description": "...",
      "source": "generated",
      "similarity": 0.85
    },
    ...
  ]
}
```

### GET /api/similarity/:skillId

Find skills similar to a given skill.

**Query Parameters:**
- `limit` (default: 10)
- `source` (optional)

**Response:**
```json
{
  "skill": {
    "id": "uuid",
    "name": "water leak repair",
    "description": "...",
    "source": "generated"
  },
  "similar": [
    {
      "id": "uuid2",
      "name": "pipe repair",
      "description": "...",
      "source": "generated",
      "similarity": 0.82
    },
    ...
  ]
}
```

## Deployment Steps

### 1. Deploy API (This Repo)

1. Push this repo to GitHub
2. Connect to Railway (or your platform)
3. Set environment variables (see above)
4. Deploy
5. Note the API URL (e.g., `https://skilledclaws-api.railway.app`)

### 2. Deploy Frontend (skilledclawsfrontend repo)

1. Push frontend repo to GitHub
2. Connect to Vercel
3. Set environment variable:
   ```
   VITE_API_URL=https://skilledclaws-api.railway.app
   ```
4. Deploy

### 3. Update API CORS

In Railway, add environment variable:
```
FRONTEND_URL=https://your-app.vercel.app
```

Redeploy the API so it allows requests from your Vercel domain.

## Testing Locally

### Start API
```bash
cd skilledclaws
pnpm install
pnpm --filter @skilledclaws/api dev
# API runs on http://localhost:3001
```

### Start Frontend
```bash
cd skilledclawsfrontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
# Vite proxy automatically forwards /api to localhost:3001
```

### Test Connection

1. Open `http://localhost:5173`
2. Enter a word (e.g., "plumbing")
3. Check browser console for API calls
4. Verify diagram shows generated skills

## Troubleshooting

### CORS Errors

**Error:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solution:**
1. Check API CORS configuration in `apps/api/src/index.ts`
2. Ensure frontend URL is in `corsOrigins` array
3. Set `FRONTEND_URL` environment variable in API deployment

### API Not Reachable

**Error:** `Failed to fetch` or network errors

**Solution:**
1. Verify API is running: `curl https://your-api.railway.app/`
2. Check `VITE_API_URL` is set correctly in frontend
3. For local dev, ensure Vite proxy is configured

### Wrong Response Format

**Error:** Frontend can't parse API response

**Solution:**
1. Check API response matches expected format (see endpoints above)
2. Verify `mainSkill` is an object with `name` property
3. Verify `subSkills` is an array of objects with `name` property

## Data Flow Example

```
1. User enters "plumbing" in frontend
   ↓
2. Frontend calls: POST https://api.railway.app/api/generate
   Body: { "skillName": "plumbing" }
   ↓
3. API processes request:
   - Breaks down into sub-skills
   - Stores in Supabase
   - Generates embeddings
   - Returns response
   ↓
4. Frontend receives:
   {
     mainSkill: { name: "plumbing", ... },
     subSkills: [
       { id: "...", name: "water leak repair", ... },
       { id: "...", name: "toilet installation", ... },
       ...
     ]
   }
   ↓
5. Frontend displays:
   - Diagram nodes with skill names
   - Skill cards
   - Download links
```

## Support

For issues:
1. Check API logs in Railway dashboard
2. Check frontend console for errors
3. Verify environment variables are set correctly
4. Test API directly: `curl https://your-api.railway.app/api/generate -X POST -H "Content-Type: application/json" -d '{"skillName":"test"}'`
