import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load environment variables FIRST, before importing Supabase modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from root .env file
const rootEnvPath = join(__dirname, "../../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

// Note: Supabase modules are imported dynamically inside indexSkill() 
// to ensure env vars are loaded first

interface ParsedSkillMd {
  frontmatter: {
    name: string;
    description: string;
    requires?: { mcp?: string[] };
  };
  content: string;
  skillName: string; // Directory name
}

/**
 * Parse YAML frontmatter and content from SKILL.md file
 */
function parseSkillMd(content: string, skillName: string): ParsedSkillMd | null {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    // Try without frontmatter
    return {
      frontmatter: {
        name: skillName,
        description: content.substring(0, 200),
      },
      content,
      skillName,
    };
  }

  const frontmatterText = match[1];
  const markdownContent = match[2];

  // Simple YAML parsing
  const nameMatch = frontmatterText.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatterText.match(/^description:\s*(.+)$/m);
  const requiresMatch = frontmatterText.match(/^requires:\s*\n\s*mcp:\s*\[(.*?)\]/s);

  const frontmatter: ParsedSkillMd["frontmatter"] = {
    name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : skillName,
    description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, "") : markdownContent.substring(0, 200),
  };

  if (requiresMatch) {
    const mcpList = requiresMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    frontmatter.requires = { mcp: mcpList };
  }

  return {
    frontmatter,
    content: markdownContent,
    skillName,
  };
}

/**
 * Extract strategies from markdown content
 */
function extractStrategies(content: string): Array<{ title: string; content: string }> {
  const strategies: Array<{ title: string; content: string }> = [];
  const sectionRegex = /^###?\s+(.+?)$/gm;
  let lastIndex = 0;

  while (true) {
    const match = sectionRegex.exec(content);
    if (!match) break;

    const title = match[1].trim();
    const startIndex = match.index + match[0].length;
    const nextMatch = sectionRegex.exec(content);
    const endIndex = nextMatch ? nextMatch.index : content.length;
    const sectionContent = content.substring(startIndex, endIndex).trim();

    if (title && sectionContent) {
      strategies.push({ title, content: sectionContent });
    }

    if (!nextMatch) break;
    sectionRegex.lastIndex = nextMatch.index;
  }

  return strategies;
}

/**
 * Extract triggers from content
 */
function extractTriggers(content: string, skillName: string): string[] {
  const triggers: string[] = [skillName];
  const triggerPatterns = [
    /trigger[^:]*:\s*(.+?)(?:\n|$)/gi,
    /when to use[^:]*:\s*(.+?)(?:\n|$)/gi,
  ];

  for (const pattern of triggerPatterns) {
    const matches = content.matchAll(pattern);
    for (const m of matches) {
      const triggerText = m[1]?.trim();
      if (triggerText && !triggers.includes(triggerText)) {
        triggers.push(triggerText);
      }
    }
  }

  return triggers.length > 0 ? triggers : [skillName];
}

/**
 * Index a single skill from a directory
 */
async function indexSkill(skillDir: string, repoPath: string): Promise<void> {
  const skillMdPath = join(repoPath, skillDir, "SKILL.md");

  if (!existsSync(skillMdPath)) {
    console.warn(`[INDEX] SKILL.md not found in ${skillDir}`);
    return;
  }

  try {
    const content = readFileSync(skillMdPath, "utf-8");
    const parsed = parseSkillMd(content, skillDir);

    if (!parsed) {
      console.warn(`[INDEX] Failed to parse ${skillDir}`);
      return;
    }

    const strategies = extractStrategies(parsed.content);
    const triggers = extractTriggers(parsed.content, parsed.frontmatter.name);

    // Dynamically import Supabase modules (after env vars are loaded)
    const { isSupabaseConfigured, getSkillByName, storeSkill: storeSkillFn } = await import("./supabase.js");
    const { generateAndStoreSkillEmbedding: generateEmbeddingFn } = await import("./embeddings.js");
    
    if (!isSupabaseConfigured()) {
      console.error(`[INDEX] ❌ Supabase not configured! Cannot index skills.`);
      console.error(`[INDEX] Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file`);
      throw new Error("Supabase not configured");
    }

    // Check if skill already exists
    const existing = await getSkillByName(parsed.frontmatter.name);

    if (existing) {
      console.log(`[INDEX] Skill ${parsed.frontmatter.name} already exists, skipping`);
      return;
    }

    // Store new skill
    const stored = await storeSkillFn({
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description,
      triggers,
      strategies,
      prompt_templates: undefined,
      source: "awesome-claude-skills",
    });

    // Generate and store embedding
    await generateEmbeddingFn(
      stored.id,
      parsed.frontmatter.name,
      parsed.frontmatter.description,
      strategies
    );

    console.log(`[INDEX] ✅ Indexed: ${parsed.frontmatter.name}`);
  } catch (error) {
    console.error(`[INDEX] ❌ Error indexing ${skillDir}:`, error);
  }
}

/**
 * Index all skills from awesome-claude-skills repository
 * @param repoPath Path to the awesome-claude-skills repository
 */
export async function indexAllSkills(repoPath: string): Promise<void> {
  if (!existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  console.log(`[INDEX] Starting to index skills from ${repoPath}`);

  const entries = readdirSync(repoPath, { withFileTypes: true });
  const skillDirs = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));

  console.log(`[INDEX] Found ${skillDirs.length} skill directories`);

  let indexed = 0;
  let failed = 0;

  for (const dir of skillDirs) {
    try {
      await indexSkill(dir.name, repoPath);
      indexed++;
    } catch (error) {
      console.error(`[INDEX] Failed to index ${dir.name}:`, error);
      failed++;
    }
  }

  console.log(`[INDEX] Complete: ${indexed} indexed, ${failed} failed`);
}

/**
 * CLI entry point (if run directly)
 */
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('index-skills.ts') ||
                     process.argv[1]?.includes('index-skills');

if (isMainModule || process.argv[1]?.includes('index-skills')) {
  const repoPath = process.argv[2] || process.env.AWESOME_CLAUDE_SKILLS_PATH;

  if (!repoPath) {
    console.error("Usage: tsx index-skills.ts <path-to-awesome-claude-skills>");
    console.error("Or set AWESOME_CLAUDE_SKILLS_PATH environment variable");
    process.exit(1);
  }

  indexAllSkills(repoPath)
    .then(() => {
      console.log("[INDEX] Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[INDEX] Fatal error:", error);
      process.exit(1);
    });
}
