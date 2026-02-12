import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SkillBuildInput } from "@skilledclaws/skills-engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedExamples: SkillBuildInput[] | null = null;

interface ParsedSkillMd {
  frontmatter: {
    name: string;
    description: string;
    requires?: { mcp?: string[] };
  };
  content: string;
}

/**
 * Parse YAML frontmatter and content from SKILL.md file
 */
function parseSkillMd(content: string): ParsedSkillMd | null {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) return null;

  const frontmatterText = match[1];
  const markdownContent = match[2];

  // Simple YAML parsing for name, description, requires
  const nameMatch = frontmatterText.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatterText.match(/^description:\s*(.+)$/m);
  const requiresMatch = frontmatterText.match(/^requires:\s*\n\s*mcp:\s*\[(.*?)\]/s);

  const frontmatter: ParsedSkillMd["frontmatter"] = {
    name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : "",
    description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, "") : "",
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
  };
}

/**
 * Convert parsed SKILL.md to SkillBuildInput format
 */
function skillMdToSkillBuildInput(parsed: ParsedSkillMd, skillName: string): SkillBuildInput {
  // Extract strategies from markdown sections
  const strategies: Array<{ title: string; content: string }> = [];

  // Look for ## or ### headings followed by content
  const sectionRegex = /^###?\s+(.+?)$/gm;
  let lastIndex = 0;
  let match;

  while ((match = sectionRegex.exec(parsed.content)) !== null) {
    const title = match[1].trim();
    const startIndex = match.index + match[0].length;
    const nextMatch = sectionRegex.exec(parsed.content);
    const endIndex = nextMatch ? nextMatch.index : parsed.content.length;
    const content = parsed.content.substring(startIndex, endIndex).trim();

    if (title && content) {
      strategies.push({ title, content });
    }

    // Reset regex lastIndex
    sectionRegex.lastIndex = lastIndex;
    if (nextMatch) sectionRegex.lastIndex = nextMatch.index;
    lastIndex = sectionRegex.lastIndex;
  }

  // Extract triggers from content (look for common patterns)
  const triggers: string[] = [parsed.frontmatter.name];
  const triggerPatterns = [
    /trigger[^:]*:\s*(.+?)(?:\n|$)/gi,
    /when to use[^:]*:\s*(.+?)(?:\n|$)/gi,
  ];

  for (const pattern of triggerPatterns) {
    const matches = parsed.content.matchAll(pattern);
    for (const m of matches) {
      const triggerText = m[1]?.trim();
      if (triggerText && !triggers.includes(triggerText)) {
        triggers.push(triggerText);
      }
    }
  }

  return {
    skillName: parsed.frontmatter.name || skillName,
    description: parsed.frontmatter.description || parsed.content.substring(0, 200),
    triggers: triggers.length > 0 ? triggers : [skillName],
    strategies: strategies.length > 0 ? strategies : [{ title: "Overview", content: parsed.content.substring(0, 500) }],
  };
}

/**
 * Load examples from JSON file (fallback)
 */
function loadExamplesFromJson(): SkillBuildInput[] {
  try {
    const examplesPath = join(__dirname, "claude-skills-examples.json");
    if (existsSync(examplesPath)) {
      const examplesData = readFileSync(examplesPath, "utf-8");
      return JSON.parse(examplesData) as SkillBuildInput[];
    }
  } catch (err) {
    console.warn("Failed to load examples from JSON:", err);
  }
  return [];
}

/**
 * Load ALL few-shot examples
 * Tries to load from parsed SKILL.md files, falls back to JSON
 */
export function loadFewShotExamples(): SkillBuildInput[] {
  if (cachedExamples) return cachedExamples;

  const examples: SkillBuildInput[] = [];

  // Try to load from JSON file (contains pre-parsed examples)
  const jsonExamples = loadExamplesFromJson();
  examples.push(...jsonExamples);

  // Cache and return
  cachedExamples = examples;
  console.log(`[EXAMPLES] Loaded ${examples.length} few-shot examples`);
  return examples;
}

/**
 * Get few-shot examples prompt for skill generation
 * Uses all examples or a diverse selection if too many
 */
export function getFewShotExamplesPrompt(
  examples: SkillBuildInput[],
  maxExamples: number = 10
): string {
  if (examples.length === 0) return "";

  // Use all examples if under limit, otherwise select diverse ones
  const selected = examples.length <= maxExamples ? examples : selectDiverseExamples(examples, maxExamples);

  const examplesText = selected
    .map((ex, idx) => {
      const strategies = ex.strategies
        .map((s: { title: string; content: string }) => `- **${s.title}**: ${s.content.substring(0, 300)}${s.content.length > 300 ? "..." : ""}`)
        .join("\n");

      return `Example ${idx + 1}:
Skill Name: ${ex.skillName}
Description: ${ex.description}
Trigger Phrases: ${ex.triggers.join(", ")}
Strategies:
${strategies}`;
    })
    .join("\n\n");

  return `Here are ${selected.length} examples of high-quality skill packs from the awesome-claude-skills repository:

${examplesText}

Use these as reference for structure, depth, and quality. Generate similar quality content with:
- Clear YAML frontmatter (name, description, optional requires)
- Detailed sections like "Prerequisites", "Setup", "Core Workflows"
- Each workflow should have "When to use", "Tool sequence", "Key parameters", "Pitfalls"
- Professional, detailed style matching these examples.`;
}

/**
 * Select diverse examples (different categories/types)
 */
function selectDiverseExamples(examples: SkillBuildInput[], count: number): SkillBuildInput[] {
  // Simple diversity: take evenly spaced examples
  const step = Math.floor(examples.length / count);
  const selected: SkillBuildInput[] = [];

  for (let i = 0; i < examples.length && selected.length < count; i += step) {
    selected.push(examples[i]);
  }

  // Fill remaining slots
  while (selected.length < count && selected.length < examples.length) {
    const remaining = examples.filter((ex) => !selected.includes(ex));
    if (remaining.length > 0) {
      selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
    } else {
      break;
    }
  }

  return selected;
}
