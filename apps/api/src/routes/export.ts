import type { Hono } from "hono";
import { z } from "zod";
import { getSkillById, getAllSkills, type Skill } from "../services/supabase.js";
import { renderSkillMd } from "@skilledclaws/skills-engine";
import JSZip from "jszip";

const exportRequestSchema = z.object({
  skillIds: z.array(z.string()).optional(),
  format: z.enum(["json", "zip"]).default("json"),
});

export function registerExport(app: Hono) {
  // Export skills endpoint
  app.post("/api/export", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = exportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request" }, 400);
    }

    const { skillIds, format } = parsed.data;

    try {
      let skills;
      
      if (skillIds && skillIds.length > 0) {
        // Export specific skills
        skills = await Promise.all(
          skillIds.map(async (id) => {
            const skill = await getSkillById(id);
            if (!skill) {
              throw new Error(`Skill ${id} not found`);
            }
            return skill;
          })
        );
      } else {
        // Export all skills
        const result = await getAllSkills(1000, 0);
        // Fetch full skill details for each
        skills = await Promise.all(
          result.skills.map(async (s) => {
            const fullSkill = await getSkillById(s.id);
            if (!fullSkill) {
              throw new Error(`Skill ${s.id} not found`);
            }
            return fullSkill;
          })
        );
      }

      if (format === "zip") {
        // Create ZIP with SKILL.md files
        const zip = new JSZip();
        
        for (const skill of skills) {
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
          
          zip.file(`${skill.name}/SKILL.md`, skillMd);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        
        c.header("Content-Type", "application/zip");
        c.header("Content-Disposition", `attachment; filename="skilledclaws-export-${Date.now()}.zip"`);
        // @ts-expect-error - Hono body accepts Buffer but types are strict
        return c.body(zipBuffer);
      } else {
        // Return JSON
        return c.json({
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          skills: skills.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            triggers: s.triggers,
            strategies: s.strategies,
            prompt_templates: s.prompt_templates,
            source: s.source,
          })),
        });
      }
    } catch (error) {
      console.error("[EXPORT] Error:", error);
      return c.json(
        {
          error: "Failed to export skills",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });
}
