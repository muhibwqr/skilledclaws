import archiver from "archiver";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { Readable, Writable } from "stream";
import type { SkillBuildInput } from "./types.js";
import { skillBuildInputSchema } from "./schema.js";
import type { SkillBuildInputSchema } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Use C native zip builder when total content size exceeds this (bytes). */
export const HUGE_INPUT_THRESHOLD = 512 * 1024;

export interface ZipEntry {
  path: string;
  buffer: Buffer;
}

function getEntries(parsed: SkillBuildInputSchema, version: string): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const skillMd = renderSkillMd(parsed, version);
  entries.push({ path: "SKILL.md", buffer: Buffer.from(skillMd, "utf-8") });

  const scriptExt = parsed.scriptLogic?.language === "python" ? "py" : "ts";
  const scriptCode =
    parsed.scriptLogic?.code ??
    (parsed.scriptLogic?.language === "python"
      ? "# Skill logic placeholder\n# Implement your skill here\n"
      : "// Skill logic placeholder\n// Implement your skill here\n");
  entries.push({ path: `scripts/main.${scriptExt}`, buffer: Buffer.from(scriptCode, "utf-8") });

  for (let i = 0; i < parsed.strategies.length; i++) {
    const s = parsed.strategies[i];
    const safeName = s.title.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    entries.push({
      path: `references/${safeName}.md`,
      buffer: Buffer.from(`# ${s.title}\n\n${s.content}`, "utf-8"),
    });
  }
  if (parsed.strategies.length === 0) {
    entries.push({
      path: "references/strategies.md",
      buffer: Buffer.from("# Strategies\n\nAdd successful patterns here.", "utf-8"),
    });
  }

  if (parsed.promptTemplates?.length) {
    for (const pt of parsed.promptTemplates) {
      entries.push({ path: `assets/prompts/${pt.id}.txt`, buffer: Buffer.from(pt.template, "utf-8") });
    }
    const promptsIndex = parsed.promptTemplates.map((p: { id: string; name: string }) => `- ${p.id}: ${p.name}`).join("\n");
    entries.push({ path: "assets/prompts/README.md", buffer: Buffer.from(promptsIndex, "utf-8") });
  } else {
    entries.push({
      path: "assets/prompts/README.md",
      buffer: Buffer.from("# Prompt templates\n\nAdd .txt templates here.", "utf-8"),
    });
  }
  entries.push({
    path: "assets/schema.json",
    buffer: Buffer.from(JSON.stringify({ skillName: parsed.skillName, version }, null, 2), "utf-8"),
  });
  return entries;
}

function getNativeZipPath(): string {
  return path.join(__dirname, "..", "native", "zip_from_stdin");
}

async function buildZipBufferNative(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const bin = getNativeZipPath();
    const child = spawn(bin, [], { stdio: ["pipe", "pipe", "pipe"] });
    const outChunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => outChunks.push(chunk));
    child.stdout.on("end", () => {
      child.on("close", (code) => {
        if (code === 0) resolve(Buffer.concat(outChunks));
        else reject(new Error(`zip_from_stdin exited ${code}`));
      });
    });
    child.on("error", reject);
    child.stderr.on("data", (d: Buffer) => process.stderr.write(d));
    for (const e of entries) {
      child.stdin.write(`${e.path}\n`);
      child.stdin.write(`${e.buffer.length}\n`);
      child.stdin.write(e.buffer);
    }
    child.stdin.write("DONE\n");
    child.stdin.end();
  });
}

const SKILL_MD_TEMPLATE = `# {{skillName}}

{{description}}

## Trigger phrases

Use these phrases when you want this skill to activate:

{{#each triggers}}
- {{this}}
{{/each}}

## Version

{{version}}

## Layers

{{#each layers}}
- **{{name}}** ({{type}}): {{description}}
{{/each}}
`;

export function renderSkillMd(input: SkillBuildInput, version: string): string {
  const lines: string[] = [];
  
  // YAML frontmatter (matching awesome-claude-skills format)
  lines.push("---");
  lines.push(`name: ${input.skillName}`);
  lines.push(`description: "${input.description.replace(/"/g, '\\"')}"`);
  lines.push("---");
  lines.push("");
  
  // Main title
  lines.push(`# ${input.skillName}`);
  lines.push("");
  lines.push(input.description);
  lines.push("");

  // Prerequisites section (if applicable)
  if (input.strategies.some((s: { title: string }) => s.title.toLowerCase().includes("prerequisite"))) {
    lines.push("## Prerequisites");
    lines.push("");
    const prereq = input.strategies.find((s: { title: string }) => s.title.toLowerCase().includes("prerequisite"));
    if (prereq) {
      lines.push(prereq.content);
      lines.push("");
    }
  }

  // Setup section (if applicable)
  if (input.strategies.some((s: { title: string }) => s.title.toLowerCase().includes("setup"))) {
    lines.push("## Setup");
    lines.push("");
    const setup = input.strategies.find((s: { title: string }) => s.title.toLowerCase().includes("setup"));
    if (setup) {
      lines.push(setup.content);
      lines.push("");
    }
  }

  // Core Workflows section
  const workflows = input.strategies.filter(
    (s: { title: string }) => !s.title.toLowerCase().includes("prerequisite") && !s.title.toLowerCase().includes("setup")
  );

  if (workflows.length > 0) {
    lines.push("## Core Workflows");
    lines.push("");
    lines.push("These workflows provide step-by-step guidance for common tasks:");
    lines.push("");
    
    workflows.forEach((strategy, idx) => {
      lines.push(`### ${idx + 1}. ${strategy.title}`);
      lines.push("");
      // Preserve markdown formatting in strategy content
      lines.push(strategy.content);
      lines.push("");
      
      // Add separator between workflows (except last one)
      if (idx < workflows.length - 1) {
        lines.push("---");
        lines.push("");
      }
    });
  }

  // Trigger phrases (if not already in workflows)
  if (input.triggers.length > 0) {
    lines.push("## Trigger Phrases");
    lines.push("");
    lines.push("Use these phrases when you want this skill to activate:");
    lines.push("");
    for (const t of input.triggers) {
      lines.push(`- ${t}`);
    }
    lines.push("");
  }

  // Version
  lines.push("## Version");
  lines.push("");
  lines.push(version);
  lines.push("");

  return lines.join("\n");
}

export class SkillBuilder {
  constructor(
    private readonly version = "1.0.0",
    private readonly hugeThreshold = HUGE_INPUT_THRESHOLD
  ) {}

  async buildZipBuffer(input: SkillBuildInput): Promise<Buffer> {
    const parsed = skillBuildInputSchema.parse(input);
    const entries = getEntries(parsed, this.version);
    const totalSize = entries.reduce((sum, e) => sum + e.buffer.length, 0);

    if (totalSize >= this.hugeThreshold) {
      try {
        return await buildZipBufferNative(entries);
      } catch (err) {
        console.warn("Native ZIP builder failed, using JS fallback:", err);
      }
    }

    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    const collector = new Writable({
      write(chunk: unknown, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
        cb();
      },
      final(cb) {
        cb();
      },
    });
    
    archive.pipe(collector);
    
    for (const e of entries) {
      archive.append(e.buffer, { name: e.path });
    }

    return new Promise((resolve, reject) => {
      archive.on("error", reject);
      collector.on("error", reject);
      
      collector.on("finish", () => {
        resolve(Buffer.concat(chunks));
      });

      archive.finalize().catch(reject);
    });
  }

  async buildZipStream(input: SkillBuildInput): Promise<Readable> {
    const parsed = skillBuildInputSchema.parse(input);
    const archive = archiver("zip", { zlib: { level: 9 } });

    const skillMd = renderSkillMd(parsed, this.version);
    archive.append(skillMd, { name: "SKILL.md" });

    const scriptExt = parsed.scriptLogic?.language === "python" ? "py" : "ts";
    const scriptCode =
      parsed.scriptLogic?.code ??
      (parsed.scriptLogic?.language === "python"
        ? "# Skill logic placeholder\n# Implement your skill here\n"
        : "// Skill logic placeholder\n// Implement your skill here\n");
    archive.append(scriptCode, { name: `scripts/main.${scriptExt}` });

    for (let i = 0; i < parsed.strategies.length; i++) {
      const s = parsed.strategies[i];
      const safeName = s.title.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
      archive.append(`# ${s.title}\n\n${s.content}`, {
        name: `references/${safeName}.md`,
      });
    }
    if (parsed.strategies.length === 0) {
      archive.append("# Strategies\n\nAdd successful patterns here.", {
        name: "references/strategies.md",
      });
    }

    if (parsed.promptTemplates?.length) {
      for (const pt of parsed.promptTemplates) {
        archive.append(pt.template, { name: `assets/prompts/${pt.id}.txt` });
      }
      const promptsIndex = parsed.promptTemplates
        .map((p) => `- ${p.id}: ${p.name}`)
        .join("\n");
      archive.append(promptsIndex, { name: "assets/prompts/README.md" });
    } else {
      archive.append("# Prompt templates\n\nAdd .txt templates here.", {
        name: "assets/prompts/README.md",
      });
    }
    archive.append(
      JSON.stringify({ skillName: parsed.skillName, version: this.version }, null, 2),
      { name: "assets/schema.json" }
    );

    await archive.finalize();
    return archive;
  }
}
