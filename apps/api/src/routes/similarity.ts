import type { Hono } from "hono";
import { generateEmbedding, isOpenAIConfigured } from "../services/embeddings.js";
import { findSimilarSkills, getSkillById } from "../services/supabase.js";

export function registerSimilarity(app: Hono) {
  // Find similar skills by skill ID
  app.get("/api/similarity/:skillId", async (c) => {
    const skillId = c.req.param("skillId");
    const limit = Number(c.req.query("limit")) || 10;
    const source = c.req.query("source") as "generated" | "awesome-claude-skills" | undefined;

    try {
      const skill = await getSkillById(skillId);
      if (!skill) {
        return c.json({ error: "Skill not found" }, 404);
      }

      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        // Return empty results instead of error when OpenAI is not configured
        return c.json({
          skill: {
            id: skill.id,
            name: skill.name,
            description: skill.description,
            source: skill.source,
          },
          similar: [],
          message: "Similarity search requires OpenAI API key",
        });
      }

      // Get embedding for this skill
      const embedding = await generateEmbedding(
        `${skill.name}\n\n${skill.description}\n\n${skill.strategies.map((s) => `${s.title}: ${s.content}`).join("\n")}`
      );

      // Find similar skills
      const similar = await findSimilarSkills(embedding, limit, source);

      return c.json({
        skill: {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          source: skill.source,
        },
        similar: similar.map((s) => ({
          id: s.skill.id,
          name: s.skill.name,
          description: s.skill.description,
          source: s.skill.source,
          similarity: s.similarity,
        })),
      });
    } catch (error) {
      console.error("Similarity search error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If OpenAI is not configured, return graceful response
      if (errorMessage.includes("OpenAI is not configured")) {
        return c.json({
          skill: {
            id: skillId,
            name: "",
            description: "",
            source: "generated" as const,
          },
          similar: [],
          message: "Similarity search requires OpenAI API key",
        });
      }
      
      return c.json({ 
        error: "Failed to find similar skills",
        details: errorMessage 
      }, 500);
    }
  });

  // Search skills by text query
  app.post("/api/similarity/search", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const query = body.query as string | undefined;
    const limit = Number(body.limit) || 10;
    const source = body.source as "generated" | "awesome-claude-skills" | undefined;

    if (!query || typeof query !== "string") {
      return c.json({ error: "Query is required" }, 400);
    }

    try {
      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        return c.json({
          query,
          results: [],
          message: "Text search requires OpenAI API key",
        });
      }

      // Generate embedding for query
      const embedding = await generateEmbedding(query);

      // Find similar skills
      const similar = await findSimilarSkills(embedding, limit, source);

      return c.json({
        query,
        results: similar.map((s) => ({
          id: s.skill.id,
          name: s.skill.name,
          description: s.skill.description,
          source: s.skill.source,
          similarity: s.similarity,
        })),
      });
    } catch (error) {
      console.error("Search error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If OpenAI is not configured, return graceful response
      if (errorMessage.includes("OpenAI is not configured")) {
        return c.json({
          query: query || "",
          results: [],
          message: "Text search requires OpenAI API key",
        });
      }
      
      return c.json({ 
        error: "Failed to search skills",
        details: errorMessage 
      }, 500);
    }
  });
}
