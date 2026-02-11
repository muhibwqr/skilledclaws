import { Agent } from "@mastra/core/agent";
import { z } from "zod";

const subSkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  triggers: z.array(z.string()),
  strategies: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ),
});

const skillBreakdownSchema = z.object({
  mainSkill: z.object({
    name: z.string(),
    description: z.string(),
  }),
  subSkills: z.array(subSkillSchema).min(3).max(8),
});

export const skillBreakdownAgent = new Agent({
  id: "skill-breakdown",
  name: "Skill Breakdown",
  instructions: `You are an expert at breaking down complex skills or trades into specific, actionable sub-skills.

When given a skill or trade name (e.g., "plumbing", "web development", "crypto trading"), you must:

1. Identify 3-8 specific sub-skills that are essential components of the main skill
2. Each sub-skill should be:
   - A specific, actionable aspect (e.g., "water leak repair", "toilet installation", "pipe repair" for plumbing)
   - Self-contained with its own description, triggers, and strategies
   - Related to the main skill but distinct enough to be its own node
   - Practical and useful on its own

3. For each sub-skill, generate:
   - A clear, specific name (2-4 words)
   - A description (2-3 sentences explaining what this sub-skill covers)
   - 3-5 trigger phrases users might say
   - 2-4 strategies with titles and detailed content (200-400 words each)

Example for "plumbing":
- Sub-skill: "water leak repair"
  Description: "Diagnose and fix water leaks in pipes, fixtures, and appliances. Includes identifying leak sources, selecting repair methods, and preventing future leaks."
  Triggers: ["fix water leak", "repair leak", "water leak", "leaking pipe"]
  Strategies: [{"title": "Leak Detection", "content": "..."}, {"title": "Repair Methods", "content": "..."}]

- Sub-skill: "toilet installation"
  Description: "Install, replace, and repair toilets. Covers removal of old units, proper mounting, water connections, and testing."
  Triggers: ["install toilet", "replace toilet", "toilet installation", "new toilet"]
  Strategies: [{"title": "Removal Process", "content": "..."}, {"title": "Installation Steps", "content": "..."}]

Return only valid JSON matching the schema.`,
  model: "openai/gpt-4o",
  tools: {},
});

export async function breakDownSkill(skillName: string): Promise<z.infer<typeof skillBreakdownSchema>> {
  const prompt = `Break down the skill or trade "${skillName}" into 3-8 specific, actionable sub-skills. Each sub-skill should be a distinct aspect that can stand alone but is part of the larger skill domain.`;

  const result = await skillBreakdownAgent.generate(prompt, {
    structuredOutput: {
      schema: skillBreakdownSchema,
      errorStrategy: "fallback",
      fallbackValue: {
        mainSkill: {
          name: skillName,
          description: `Comprehensive skill pack for ${skillName}.`,
        },
        subSkills: [
          {
            name: `${skillName} basics`,
            description: `Fundamental aspects of ${skillName}.`,
            triggers: [`${skillName}`, `help with ${skillName}`],
            strategies: [{ title: "Overview", content: "Basic information about this skill." }],
          },
        ],
      },
    },
    modelSettings: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  });

  const parsed = skillBreakdownSchema.safeParse(result?.object);
  if (!parsed.success) {
    throw new Error(`Failed to parse skill breakdown: ${parsed.error.message}`);
  }

  return parsed.data;
}
