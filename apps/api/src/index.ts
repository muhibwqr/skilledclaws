// Load .env files - tsx --env-file should handle this, but load manually as backup
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple locations for .env file
const possiblePaths = [
  resolve(__dirname, "../.env.local"), // apps/api/.env.local
  resolve(__dirname, "../../.env"), // root .env
  resolve(process.cwd(), ".env.local"), // apps/api/.env.local (if cwd is apps/api)
  resolve(process.cwd(), "../.env"), // root .env (if cwd is apps/api)
  resolve(process.cwd(), "../../.env"), // root .env (if cwd is apps/api/src)
];

let loaded = false;
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    const result = config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      console.log(`[ENV] Loaded from: ${envPath}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  console.warn(`[ENV] No .env file found. Tried: ${possiblePaths.join(", ")}`);
}

// Debug: log configuration
if (process.env.OPENAI_API_KEY) {
  console.log("[ENV] OpenAI configured");
} else {
  console.warn("[ENV] OpenAI NOT configured");
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("[ENV] Supabase configured");
} else {
  console.warn("[ENV] Supabase not configured (some features disabled)");
  if (!process.env.SUPABASE_URL) console.warn("[ENV]   Missing: SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn("[ENV]   Missing: SUPABASE_SERVICE_ROLE_KEY");
}
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoBindings, HonoVariables } from "@mastra/hono";
import { MastraServer } from "@mastra/hono";
import { mastra } from "./mastra/index.js";
import { rateLimitGenerate } from "./middleware/rate-limit.js";
import { registerGenerate } from "./routes/generate.js";
import { registerSimilarity } from "./routes/similarity.js";
import { registerSkills } from "./routes/skills.js";
import { registerExport } from "./routes/export.js";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

// CORS configuration: Allow frontend from separate repo
const corsOrigins = [
  "http://localhost:3000",      // Legacy Next.js dev
  "http://127.0.0.1:3000",      // Legacy Next.js dev (alt)
  "http://localhost:5173",      // Vite dev server (new frontend)
  "http://127.0.0.1:5173",      // Vite dev server (alt)
  process.env.FRONTEND_URL,     // Production frontend URL (set in deployment)
].filter(Boolean); // Remove undefined values

app.use("*", cors({ origin: corsOrigins, credentials: true }));

const server = new MastraServer({ app, mastra });
await server.init();

app.use("/api/generate", rateLimitGenerate());

registerGenerate(app);
registerSimilarity(app);
registerSkills(app);
registerExport(app);

app.get("/", (c) => c.json({ name: "skilledclaws-api", status: "ok" }));

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API running at http://localhost:${info.port}`);
});
