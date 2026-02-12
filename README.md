# SkilledClaws API

Backend API for SkilledClaws: AI-powered skill generation and `.skills` file delivery for Clawdbot.

> **Note:** The frontend is now in a [separate repository](https://github.com/muhibwqr/skilledclawsfrontend). See [FRONTEND_CONNECTION.md](./FRONTEND_CONNECTION.md) for setup instructions.

## Stack

- **Monorepo:** pnpm + Turborepo
- **API:** Hono + Mastra (agents), OpenAI, Supabase, Upstash Redis (rate limit), Stripe, Cloudflare R2
- **Shared:** `@skilledclaws/skills-engine`, `@skilledclaws/ts-config`

## Quick start

```bash
pnpm install
pnpm --filter @skilledclaws/api dev
```

- **API:** http://localhost:3001  

## CORS

The API allows requests from:
- `http://localhost:5173` (Vite dev server - new frontend)
- `http://localhost:3000` (legacy Next.js)
- Production frontend URL (set via `FRONTEND_URL` environment variable)

For production, set `FRONTEND_URL` in your deployment platform (e.g., Railway) to your frontend domain.

## Environment

Copy `.env.example` and set in `apps/api/.env.local` or root `.env`:

**Required:**
- `OPENAI_API_KEY` - OpenAI API key for embeddings and AI generation
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_STORAGE_BUCKET` - Supabase storage bucket name (default: "skills")

**Optional:**
- `FRONTEND_URL` - Production frontend URL for CORS (e.g., `https://your-app.vercel.app`)
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `UPSTASH_REDIS_*` - Redis connection for rate limiting
- `ANTHROPIC_API_KEY` - Claude API key (if using Claude for synthesis)
- `CLOUDFLARE_R2_*` - Cloudflare R2 storage (alternative to Supabase)

## Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Use the printed webhook signing secret as `STRIPE_WEBHOOK_SECRET`.

## Huge inputs (C native ZIP)

For large skill content (default threshold 512KB), the skills-engine can build the ZIP using a small C program so memory stays bounded. Build it once:

```bash
cd packages/skills-engine/native
# Install libzip if needed: brew install libzip  (or apt install libzip-dev)
make
cd -
```

If the C binary is missing or fails, the engine falls back to the JS (archiver) implementation.

## Scripts

| Command     | Description                |
|------------|----------------------------|
| `pnpm --filter @skilledclaws/api dev` | Run API in dev mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | Type-check all packages |

## API Endpoints

### POST /api/generate
Generate skills from a single word. Returns `mainSkill` and `subSkills` array.

**Request:**
```json
{ "skillName": "plumbing" }
```

**Response:**
```json
{
  "success": true,
  "mainSkill": { "name": "plumbing", "description": "..." },
  "subSkills": [
    { "id": "...", "name": "water leak repair", ... },
    ...
  ],
  "skillIds": ["uuid1", "uuid2", ...]
}
```

### GET /api/skills
List all skills with pagination. Query params: `limit`, `offset`, `source`.

### GET /api/skills/:id/download
Download skill file as `.md`.

### POST /api/similarity/search
Search skills by text query.

### GET /api/similarity/:skillId
Find similar skills by skill ID.

See [FRONTEND_CONNECTION.md](./FRONTEND_CONNECTION.md) for complete API documentation and frontend setup.

## Deployment

This API is designed to be deployed separately from the frontend:

1. **Deploy API:** Railway, Render, Fly.io, or similar
2. **Deploy Frontend:** Vercel, Netlify, or similar (see [skilledclawsfrontend](https://github.com/muhibwqr/skilledclawsfrontend))
3. **Connect:** Set `VITE_API_URL` in frontend to point to your API URL
4. **CORS:** Set `FRONTEND_URL` in API to allow frontend domain

See [FRONTEND_CONNECTION.md](./FRONTEND_CONNECTION.md) for detailed deployment instructions.
