const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export interface SimilarSkill {
  id: string;
  name: string;
  description: string;
  source: "generated" | "awesome-claude-skills";
  similarity: number;
}

export interface SearchResult {
  query: string;
  results: SimilarSkill[];
}

export interface SkillsResponse {
  skills: Omit<Skill, "strategies" | "prompt_templates">[];
  total: number;
  limit: number;
  offset: number;
}

export interface SimilarityResponse {
  skill: {
    id: string;
    name: string;
    description: string;
    source: "generated" | "awesome-claude-skills";
  };
  similar: SimilarSkill[];
}

// Get all skills with pagination
export async function getAllSkills(
  limit: number = 100,
  offset: number = 0,
  source?: "generated" | "awesome-claude-skills"
): Promise<SkillsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (source) params.append("source", source);

  const res = await fetch(`${API_URL}/api/skills?${params}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.details || `HTTP ${res.status}: Failed to fetch skills`;
    throw new Error(errorMessage);
  }
  return res.json();
}

// Get skill by ID
export async function getSkillDetails(skillId: string): Promise<Skill> {
  const res = await fetch(`${API_URL}/api/skills/${skillId}`);
  if (!res.ok) throw new Error("Failed to fetch skill");
  return res.json();
}

// Alias for getSkillDetails
export const getSkillById = getSkillDetails;

// Get skill by name
export async function getSkillByName(name: string): Promise<Skill> {
  const res = await fetch(`${API_URL}/api/skills/name/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Failed to fetch skill");
  return res.json();
}

// Get similar skills
export async function getSimilarSkills(
  skillId: string,
  limit: number = 10,
  source?: "generated" | "awesome-claude-skills"
): Promise<SimilarityResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (source) params.append("source", source);

  const res = await fetch(`${API_URL}/api/similarity/${skillId}?${params}`);
  if (!res.ok) throw new Error("Failed to fetch similar skills");
  return res.json();
}

// Search skills by text query
export async function searchSkills(
  query: string,
  limit: number = 10,
  source?: "generated" | "awesome-claude-skills"
): Promise<SearchResult> {
  const res = await fetch(`${API_URL}/api/similarity/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, source }),
  });
  if (!res.ok) throw new Error("Failed to search skills");
  return res.json();
}

// Get recommendations for a skill
export async function getRecommendations(skillId: string): Promise<SimilarSkill[]> {
  const response = await getSimilarSkills(skillId, 5);
  return response.similar;
}

// Generate a new skill (create checkout session)
export async function generateSkill(skillName: string): Promise<{ url: string }> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${API_URL}/api/generate/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skillName,
      successUrl: origin ? `${origin}/success?session_id={CHECKOUT_SESSION_ID}` : undefined,
      cancelUrl: origin || undefined,
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to generate skill" }));
    throw new Error(error.error || "Failed to generate skill");
  }
  return res.json();
}

// Legacy function for compatibility
export async function createCheckoutSession(skillName: string): Promise<{ url: string }> {
  return generateSkill(skillName);
}
