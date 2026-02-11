import type { Hono } from "hono";
import { searchQuerySchema } from "../middleware/sanitize.js";
import { skillBuilderAgent } from "../mastra/agents/skill-builder.js";
import { searchResponseSchema } from "../mastra/schemas.js";

export function registerSearch(app: Hono) {
  app.get("/api/search", async (c) => {
    const query = c.req.query("q");
    const parsed = searchQuerySchema.safeParse({ q: query ?? "" });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const q = parsed.data.q;

    try {
      const result = await skillBuilderAgent.generate(
        `Research the skill or trade: "${q}". Return trends (names + optional descriptions) and geographic locations (name, lat, lng) where this skill is relevant.`,
        {
          structuredOutput: {
            schema: searchResponseSchema,
            errorStrategy: "fallback",
            fallbackValue: { trends: [], locations: [] },
          },
          modelSettings: { maxOutputTokens: 1024 },
        }
      );

      const data = result?.object ?? result?.text;
      const parsedResponse = typeof data === "object" && data !== null
        ? searchResponseSchema.safeParse(data)
        : parseJsonSearchResponse(result?.text);

      const { trends = [], locations = [] } = parsedResponse.success
        ? parsedResponse.data
        : { trends: [] as { name: string; description?: string }[], locations: [] as { name: string; lat: number; lng: number }[] };

      const geojson = {
        type: "FeatureCollection" as const,
        features: locations.map((loc) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [loc.lng, loc.lat] as [number, number] },
          properties: { name: loc.name },
        })),
      };

      return c.json({
        trends: trends.map((t) => ({ name: t.name, description: t.description })),
        geojson,
      });
    } catch (err) {
      console.error("Search agent error:", err);
      return c.json({
        trends: [],
        geojson: { type: "FeatureCollection" as const, features: [] },
      });
    }
  });
}

function parseJsonSearchResponse(text: string | undefined): { success: boolean; data?: { trends: { name: string; description?: string }[]; locations: { name: string; lat: number; lng: number }[] } } {
  if (!text?.trim()) return { success: false };
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { success: false };
  try {
    const data = searchResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
    return data.success ? { success: true, data: data.data } : { success: false };
  } catch {
    return { success: false };
  }
}
