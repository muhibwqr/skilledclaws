# SkilledClaws

Monorepo for SkilledClaws: map-based skill discovery and $3 `.skills` file delivery for Clawdbot.

## Stack

- **Monorepo:** pnpm + Turborepo
- **Web:** Next.js 14 (App Router), Tailwind, Mapbox GL (grey heatmap)
- **API:** Hono + Mastra (agents), Upstash Redis (rate limit), Stripe, Cloudflare R2
- **Shared:** `@skilledclaws/ui`, `@skilledclaws/skills-engine`, `@skilledclaws/ts-config`

## Quick start

```bash
pnpm install
pnpm dev
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:3001  

## CORS

The API allows `http://localhost:3000` and `http://127.0.0.1:3000` by default. For production, set `CORS_ORIGIN` and update the API to use it in the `cors()` middleware.

## Environment

Copy `.env.example` and set:

- **Web** (`apps/web/.env.local` or root): `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **API** (`apps/api/.env.local` or root): `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDFLARE_R2_*`, optional `UPSTASH_REDIS_*` (rate limiting), optional `ANTHROPIC_API_KEY` (if using Claude for synthesis)

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
| `pnpm dev` | Run web + API in dev       |
| `pnpm build` | Build all apps/packages |
| `pnpm lint` | Lint                      |
| `pnpm type-check` | Type-check           |

## MVP flow

1. **Search:** User enters up to 5 words → rate-limited search → Mastra agent returns trends + locations → map heatmap and trend cards update.
2. **Checkout:** User clicks “Generate for $3” → Stripe Checkout → success redirect to `/success?session_id=...`.
3. **Webhook:** Stripe `checkout.session.completed` → synthesis agent builds skill content → ZIP built with `@skilledclaws/skills-engine` → upload to R2 → presigned URL stored.
4. **Download:** Success page polls `GET /api/generate/download?session_id=...` → user gets download link when ready.
