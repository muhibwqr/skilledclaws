import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { HonoBindings, HonoVariables } from "@mastra/hono";
import { MastraServer } from "@mastra/hono";
import { mastra } from "./mastra/index.js";
import { rateLimitSearch, rateLimitGenerate } from "./middleware/rate-limit.js";
import { registerSearch } from "./routes/search.js";
import { registerGenerate } from "./routes/generate.js";
import { registerWebhook } from "./routes/webhook.js";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

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
