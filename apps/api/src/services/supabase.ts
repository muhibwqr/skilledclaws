import { createClient } from "@supabase/supabase-js";

// Lazy initialization to ensure env vars are loaded
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "skills";

export function isSupabaseConfigured(): boolean {
  const client = getSupabaseClient();
  return Boolean(client && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadSkillZip(
  key: string,
  buffer: Buffer,
  contentType = "application/zip"
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await client.storage.from(bucketName).upload(key, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const DOWNLOAD_URL_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUrl(key, DOWNLOAD_URL_EXPIRY_SECONDS);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "Unknown error"}`);
  }

  return data.signedUrl;
}

export function skillKey(sessionId: string, skillName: string): string {
  const safeName = skillName.replace(/[^a-z0-9-_]/gi, "_");
  return `skills/${sessionId}/${safeName}.skills`;
}

// Skills and embeddings functions
export interface Skill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  strategies: Array<{ title: string; content: string }>;
  prompt_templates?: Array<{ id: string; name: string; template: string }>;
  source: "generated" | "awesome-claude-skills";
  created_at: string;
  updated_at: string;
}

export interface SkillEmbedding {
  id: string;
  skill_id: string;
  embedding: number[];
  created_at: string;
}

export async function storeSkill(skill: Omit<Skill, "id" | "created_at" | "updated_at">): Promise<Skill> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await client
    .from("skills")
    .insert({
      name: skill.name,
      description: skill.description,
      triggers: skill.triggers,
      strategies: skill.strategies,
      prompt_templates: skill.prompt_templates || null,
      source: skill.source,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store skill: ${error.message}`);
  }

  return data as Skill;
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await client.from("skills").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to get skill: ${error.message}`);
  }

  return data as Skill;
}

export async function getSkillByName(name: string): Promise<Skill | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await client.from("skills").select("*").eq("name", name).single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to get skill: ${error.message}`);
  }

  return data as Skill;
}

export async function storeSkillEmbedding(skillId: string, embedding: number[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  // Supabase expects vector as a string in format: "[1,2,3,...]"
  const embeddingStr = `[${embedding.join(",")}]`;

  const { error } = await client
    .from("skill_embeddings")
    .upsert(
      {
        skill_id: skillId,
        embedding: embeddingStr,
      },
      {
        onConflict: "skill_id",
      }
    );

  if (error) {
    throw new Error(`Failed to store embedding: ${error.message}`);
  }
}

export async function findSimilarSkills(
  embedding: number[],
  limit: number = 10,
  source?: "generated" | "awesome-claude-skills"
): Promise<Array<{ skill: Skill; similarity: number }>> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  // Use pgvector cosine similarity via SQL
  // We'll use a raw SQL query with the vector similarity operator
  const embeddingStr = `[${embedding.join(",")}]`;

  // Build the SQL query
  let sqlQuery = `
    SELECT 
      s.*,
      1 - (se.embedding <=> $1::vector) as similarity
    FROM skill_embeddings se
    JOIN skills s ON se.skill_id = s.id
    WHERE 1 - (se.embedding <=> $1::vector) > 0.5
  `;

  if (source) {
    sqlQuery += ` AND s.source = '${source}'`;
  }

  sqlQuery += ` ORDER BY similarity DESC LIMIT ${limit * 2}`;

  // Use RPC or direct query - for now, let's fetch all and calculate in JS
  // This is a fallback approach until we set up the RPC function
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    throw new Error("Supabase is not configured");
  }
  
  const { data: embeddingsData, error } = await supabaseClient
    .from("skill_embeddings")
    .select(
      `
      skill_id,
      embedding,
      skills!inner(*)
    `
    )
    .limit(limit * 3); // Get more to filter and calculate similarity

  if (error) {
    console.error("Similarity search error:", error);
    return [];
  }

  // Calculate cosine similarity manually
  const results: Array<{ skill: Skill; similarity: number }> = [];

  for (const item of embeddingsData || []) {
    const skill = item.skills as Skill;
    if (source && skill.source !== source) continue;

    // Get embedding vector - Supabase returns it as a string or array
    let storedEmbedding: number[] = [];
    if (Array.isArray(item.embedding)) {
      storedEmbedding = item.embedding;
    } else if (typeof item.embedding === "string") {
      // Parse string representation
      try {
        storedEmbedding = JSON.parse(item.embedding);
      } catch {
        continue;
      }
    }

    if (storedEmbedding.length !== embedding.length) continue;

    // Calculate cosine similarity
    const dotProduct = embedding.reduce((sum, val, i) => sum + val * storedEmbedding[i], 0);
    const magnitudeA = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(storedEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) continue;
    
    const similarity = dotProduct / (magnitudeA * magnitudeB);

    if (similarity > 0.5) {
      results.push({ skill, similarity });
    }
  }

  // Sort by similarity and return top results
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function getAllSkills(
  limit: number = 100,
  offset: number = 0,
  source?: "generated" | "awesome-claude-skills"
): Promise<{ skills: Skill[]; total: number }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.");
  }

  try {
    let query = client.from("skills").select("*", { count: "exact" });

    if (source) {
      query = query.eq("source", source);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase query error:", error);
      throw new Error(`Failed to get skills: ${error.message} (code: ${error.code})`);
    }

    return {
      skills: (data || []) as Skill[],
      total: count || 0,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Failed to get skills: ${String(err)}`);
  }
}
