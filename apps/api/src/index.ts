import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoBindings, HonoVariables } from "@mastra/hono";
import { MastraServer } from "@mastra/hono";
import { mastra } from "./mastra/index.js";
import { rateLimitSearch, rateLimitGenerate } from "./middleware/rate-limit.js";
import { registerSearch } from "./routes/search.js";
import { registerGenerate } from "./routes/generate.js";
import { registerWebhook } from "./routes/webhook.js";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

app.use("*", cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"], credentials: true }));

const server = new MastraServer({ app, mastra });
await server.init();

app.use("/api/search", rateLimitSearch());
app.use("/api/generate/checkout", rateLimitGenerate());

registerSearch(app);
registerGenerate(app);
registerWebhook(app);

app.get("/", (c) => c.json({ name: "skilledclaws-api", status: "ok" }));

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API running at http://localhost:${info.port}`);
});
