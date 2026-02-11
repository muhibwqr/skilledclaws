import { z } from "zod";

export const skillLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["scripts", "references", "assets"]),
});

export const skillManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  triggers: z.array(z.string()),
  version: z.string().default("1.0.0"),
  layers: z.array(skillLayerSchema),
});

export type SkillManifestSchema = z.infer<typeof skillManifestSchema>;

export const skillBuildInputSchema = z.object({
  skillName: z.string().min(1),
  description: z.string(),
  triggers: z.array(z.string()),
  researchSummary: z.string().optional(),
  strategies: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ),
  promptTemplates: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        template: z.string(),
      })
    )
    .optional(),
  scriptLogic: z
    .object({
      language: z.enum(["python", "typescript"]),
      code: z.string(),
    })
    .optional(),
});

export type SkillBuildInputSchema = z.infer<typeof skillBuildInputSchema>;
