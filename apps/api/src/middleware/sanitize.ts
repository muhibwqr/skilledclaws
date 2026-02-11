import { z } from "zod";

const MAX_WORDS = 5;
const MAX_QUERY_LENGTH = 50;

function stripInjection(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/[<>{}[\]]/g, "")
    .trim();
}

export const searchQuerySchema = z.object({
  q: z
    .string()
    .max(MAX_QUERY_LENGTH)
    .transform(stripInjection)
    .refine((s) => s.trim().split(/\s+/).filter(Boolean).length <= MAX_WORDS, {
      message: `Query must be at most ${MAX_WORDS} words`,
    }),
});

export const generateBodySchema = z.object({
  skillName: z
    .string()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .transform(stripInjection)
    .refine((s) => s.trim().split(/\s+/).filter(Boolean).length <= MAX_WORDS, {
      message: `Skill name must be at most ${MAX_WORDS} words`,
    }),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type GenerateBody = z.infer<typeof generateBodySchema>;
