import type { Hono } from "hono";
import { getAllSkills, getSkillById, getSkillByName } from "../services/supabase.js";
import { renderSkillMd } from "@skilledclaws/skills-engine";

export function registerSkills(app: Hono) {
  // Download skill file
  app.get("/api/skills/:id/download", async (c) => {
    const id = c.req.param("id");
    
    try {
      const skill = await getSkillById(id);
      if (!skill) {
        return c.json({ error: "Skill not found" }, 404);
      }

      const skillMd = renderSkillMd(
        {
          skillName: skill.name,
          description: skill.description,
          triggers: skill.triggers,
          strategies: skill.strategies,
          promptTemplates: skill.prompt_templates || [],
        },
        "1.0.0"
      );

      c.header("Content-Type", "text/markdown");
      c.header("Content-Disposition", `attachment; filename="${skill.name.replace(/[^a-z0-9-_]/gi, "_")}_SKILL.md"`);
      return c.text(skillMd);
    } catch (error) {
      console.error("[SKILLS] Error downloading skill:", error);
      return c.json(
        {
          error: "Failed to download skill",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });
  // List all skills with pagination
  app.get("/api/skills", async (c) => {
    const limit = Number(c.req.query("limit")) || 100;
    const offset = Number(c.req.query("offset")) || 0;
    const source = c.req.query("source") as "generated" | "awesome-claude-skills" | undefined;

    try {
      console.log(`[API] GET /api/skills - limit: ${limit}, offset: ${offset}, source: ${source || 'all'}`);
      const result = await getAllSkills(limit, offset, source);
      console.log(`[API] Retrieved ${result.skills.length} skills (total: ${result.total})`);

      return c.json({
        skills: result.skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          triggers: s.triggers,
          source: s.source,
          created_at: s.created_at,
        })),
        total: result.total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("[API] Get skills error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[API] Error details:", errorMessage);
      if (errorStack) {
        console.error("[API] Stack trace:", errorStack.split("\n").slice(0, 5).join("\n"));
      }
      return c.json({ 
        error: "Failed to get skills",
        details: errorMessage 
      }, 500);
    }
  });

  // Get skill by ID
  app.get("/api/skills/:id", async (c) => {
    const id = c.req.param("id");

    try {
      const skill = await getSkillById(id);
      if (!skill) {
        return c.json({ error: "Skill not found" }, 404);
      }

      return c.json(skill);
    } catch (error) {
      console.error("Get skill error:", error);
      return c.json({ error: "Failed to get skill" }, 500);
    }
  });

  // Get skill by name
  app.get("/api/skills/name/:name", async (c) => {
    const name = decodeURIComponent(c.req.param("name"));

    try {
      const skill = await getSkillByName(name);
      if (!skill) {
        return c.json({ error: "Skill not found" }, 404);
      }

      return c.json(skill);
    } catch (error) {
      console.error("Get skill by name error:", error);
      return c.json({ error: "Failed to get skill" }, 500);
    }
  });
}
