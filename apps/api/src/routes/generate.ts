import type { Hono } from "hono";
import { z } from "zod";
import { skillSynthesisAgent } from "../mastra/agents/skill-synthesis.js";
import { breakDownSkill } from "../mastra/agents/skill-breakdown.js";
import { SkillBuilder, skillBuildInputSchema } from "@skilledclaws/skills-engine";
import { renderSkillMd } from "@skilledclaws/skills-engine";
import { loadFewShotExamples, getFewShotExamplesPrompt } from "../examples/load-examples.js";
import { isSupabaseConfigured, storeSkill } from "../services/supabase.js";
import { generateAndStoreSkillEmbedding } from "../services/embeddings.js";
import { uploadSkillZip, getPresignedDownloadUrl, skillKey } from "../services/supabase.js";
import { installSkillToOpenClaw, generateOpenClawInstallInstructions } from "../services/openclaw-install.js";

const builder = new SkillBuilder("1.0.0");

const generateRequestSchema = z.object({
  skillName: z.string().min(1).max(100),
});

export function registerGenerate(app: Hono) {
  // Direct skill generation endpoint (no Stripe required)
  app.post("/api/generate", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = generateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request. skillName is required." }, 400);
    }

    const { skillName } = parsed.data;

    try {
      console.log(`[GENERATE] Breaking down skill: ${skillName}`);

      // Break down the skill into sub-skills
      const breakdown = await breakDownSkill(skillName);
      console.log(`[GENERATE] Generated ${breakdown.subSkills.length} sub-skills`);

      // Store all sub-skills
      const storedSkills = [];
      const skillIds: string[] = [];

      if (isSupabaseConfigured()) {
        for (const subSkill of breakdown.subSkills) {
          try {
            const storedSkill = await storeSkill({
              name: subSkill.name,
              description: subSkill.description,
              triggers: subSkill.triggers,
              strategies: subSkill.strategies,
              prompt_templates: [],
              source: "generated",
            });

            skillIds.push(storedSkill.id);

            // Generate and store embedding for each sub-skill
            await generateAndStoreSkillEmbedding(
              storedSkill.id,
              subSkill.name,
              subSkill.description,
              subSkill.strategies
            );

            // Generate SKILL.md for this sub-skill
            const skillMd = renderSkillMd(
              {
                skillName: subSkill.name,
                description: subSkill.description,
                triggers: subSkill.triggers,
                strategies: subSkill.strategies,
                promptTemplates: [],
              },
              "1.0.0"
            );
            const skillMdBuffer = Buffer.from(skillMd, "utf-8");

            // Upload SKILL.md to Supabase storage
            const key = skillKey(`generated-${Date.now()}-${Math.random()}`, subSkill.name).replace('.skills', '.md');
            await uploadSkillZip(key, skillMdBuffer, 'text/markdown');

            storedSkills.push({
              id: storedSkill.id,
              name: storedSkill.name,
              description: storedSkill.description,
              triggers: storedSkill.triggers || [],
              strategies: storedSkill.strategies || [],
              source: "generated",
            });

            console.log(`[GENERATE] Stored sub-skill: ${subSkill.name} (${storedSkill.id})`);
          } catch (subSkillError) {
            console.error(`[GENERATE] Failed to store sub-skill ${subSkill.name}:`, subSkillError);
            // Still add to response even if storage fails
            storedSkills.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              name: subSkill.name,
              description: subSkill.description,
              triggers: subSkill.triggers || [],
              strategies: subSkill.strategies || [],
              source: "generated",
            });
          }
        }
      } else {
        console.warn("[GENERATE] Supabase not configured, skipping storage");
        // Return mock data for testing
        for (const subSkill of breakdown.subSkills) {
          storedSkills.push({
            id: `mock-${Date.now()}-${Math.random()}`,
            name: subSkill.name,
            description: subSkill.description,
            triggers: subSkill.triggers || [],
            strategies: subSkill.strategies || [],
            source: "generated",
          });
        }
      }

      console.log(`[GENERATE] Returning ${storedSkills.length} sub-skills`);

      // Ensure mainSkill is an object with name property (frontend expects this)
      const mainSkillResponse = breakdown.mainSkill && typeof breakdown.mainSkill === 'object' 
        ? breakdown.mainSkill 
        : { name: skillName, description: `Skill pack for ${skillName}` };

      return c.json({
        success: true,
        mainSkill: mainSkillResponse, // Object with { name, description }
        subSkills: storedSkills, // Array of objects with { id, name, description, triggers, strategies, source }
        skillIds,
      });
    } catch (error) {
      console.error("[GENERATE] Error:", error);
      return c.json(
        {
          error: "Failed to generate skill",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });

  // Install skill directly to OpenClaw
  app.post("/api/generate/install-openclaw", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { skillName, zipBase64, targetDir } = body;

    if (!skillName || !zipBase64) {
      return c.json({ error: "skillName and zipBase64 are required" }, 400);
    }

    try {
      const zipBuffer = Buffer.from(zipBase64, "base64");
      const result = await installSkillToOpenClaw(zipBuffer, skillName, targetDir);

      if (!result.success) {
        return c.json({ error: result.error || "Installation failed" }, 500);
      }

      return c.json({
        success: true,
        message: `Skill "${skillName}" installed to ${result.path}`,
        path: result.path,
      });
    } catch (error) {
      console.error("[INSTALL] Error:", error);
      return c.json(
        {
          error: "Failed to install skill",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  });
}

function parseSkillInputFromText(text: string | undefined, skillName: string): Record<string, unknown> {
  if (!text?.trim()) {
    return {
      skillName,
      description: `Skill pack for ${skillName}.`,
      triggers: [skillName],
      strategies: [],
    };
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { skillName, description: "", triggers: [], strategies: [] };
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return { skillName, description: "", triggers: [] };
  }
}
