import type { Hono } from "hono";
import { searchQuerySchema } from "../middleware/sanitize.js";

export function registerSearch(app: Hono) {
  app.get("/api/search", async (c) => {
    const query = c.req.query("q");
    const parsed = searchQuerySchema.safeParse({ q: query ?? "" });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    return c.json({
      trends: [],
      geojson: { type: "FeatureCollection" as const, features: [] },
    });
  });
}
