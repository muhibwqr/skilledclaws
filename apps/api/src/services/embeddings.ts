import OpenAI from "openai";
import { storeSkillEmbedding } from "./supabase.js";

const openaiApiKey = process.env.OPENAI_API_KEY;

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export function isOpenAIConfigured(): boolean {
  return Boolean(openai && openaiApiKey);
}

/**
 * Generate embedding for text using OpenAI text-embedding-3-small
 * @param text Text to embed
 * @returns Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error("OpenAI is not configured");
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate embedding for a skill (combines name, description, and strategies)
 * @param skillName Skill name
 * @param description Skill description
 * @param strategies Array of strategy objects
 * @returns Embedding vector
 */
export async function generateSkillEmbedding(
  skillName: string,
  description: string,
  strategies: Array<{ title: string; content: string }>
): Promise<number[]> {
  // Combine skill information into a single text for embedding
  const strategyText = strategies.map((s) => `${s.title}: ${s.content}`).join("\n");
  const combinedText = `${skillName}\n\n${description}\n\n${strategyText}`;

  return generateEmbedding(combinedText);
}

/**
 * Store embedding in Supabase for a skill
 * @param skillId Skill ID
 * @param embedding Embedding vector
 */
export async function storeEmbeddingForSkill(skillId: string, embedding: number[]): Promise<void> {
  await storeSkillEmbedding(skillId, embedding);
}

/**
 * Generate and store embedding for a skill
 * @param skillId Skill ID
 * @param skillName Skill name
 * @param description Skill description
 * @param strategies Array of strategy objects
 */
export async function generateAndStoreSkillEmbedding(
  skillId: string,
  skillName: string,
  description: string,
  strategies: Array<{ title: string; content: string }>
): Promise<void> {
  const embedding = await generateSkillEmbedding(skillName, description, strategies);
  await storeEmbeddingForSkill(skillId, embedding);
}
