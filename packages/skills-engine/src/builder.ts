import archiver from "archiver";
import { Readable, Writable } from "stream";
import type { SkillBuildInput } from "./types";
import { skillBuildInputSchema } from "./schema";

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

function renderSkillMd(input: SkillBuildInput, version: string): string {
  const lines: string[] = [];
  lines.push(`# ${input.skillName}`);
  lines.push("");
  lines.push(input.description);
  lines.push("");
  lines.push("## Trigger phrases");
  lines.push("");
  lines.push("Use these phrases when you want this skill to activate:");
  lines.push("");
  for (const t of input.triggers) {
    lines.push(`- ${t}`);
  }
  lines.push("");
  lines.push("## Version");
  lines.push("");
  lines.push(version);
  lines.push("");
  lines.push("## Layers");
  lines.push("");
  lines.push("- **Scripts**: Executable logic for this skill");
  lines.push("- **References**: Common strategies and successful patterns");
  lines.push("- **Assets**: Prompt templates and JSON schemas");
  return lines.join("\n");
}

export class SkillBuilder {
  constructor(private readonly version = "1.0.0") {}

  async buildZipBuffer(input: SkillBuildInput): Promise<Buffer> {
    const parsed = skillBuildInputSchema.parse(input);
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    const collector = new Writable({
      write(chunk: unknown, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
        cb();
      },
    });
    archive.pipe(collector);

    const skillMd = renderSkillMd(parsed, this.version);
    archive.append(skillMd, { name: "SKILL.md" });

    // scripts/
    const scriptExt = parsed.scriptLogic?.language === "python" ? "py" : "ts";
    const scriptCode =
      parsed.scriptLogic?.code ??
      (parsed.scriptLogic?.language === "python"
        ? "# Skill logic placeholder\n# Implement your skill here\n"
        : "// Skill logic placeholder\n// Implement your skill here\n");
    archive.append(scriptCode, { name: `scripts/main.${scriptExt}` });

    // references/
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

    // assets/
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
    archive.append(JSON.stringify({ skillName: parsed.skillName, version: this.version }, null, 2), {
      name: "assets/schema.json",
    });

    await archive.finalize();

    return new Promise((resolve, reject) => {
      collector.on("finish", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
      collector.on("error", reject);
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
