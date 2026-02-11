import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import JSZip from "jszip";
import { homedir } from "os";

/**
 * Install a .skills ZIP file into OpenClaw's skills directory
 * 
 * OpenClaw loads skills from:
 * 1. ~/.openclaw/skills (shared, highest precedence)
 * 2. <workspace>/skills (workspace-specific)
 * 
 * This function extracts the ZIP and places it in ~/.openclaw/skills
 */
export async function installSkillToOpenClaw(
  zipBuffer: Buffer,
  skillName: string,
  targetDir?: string
): Promise<{ success: boolean; path: string; error?: string }> {
  try {
    // Default to ~/.openclaw/skills (shared location)
    const openclawSkillsDir = targetDir || join(homedir(), ".openclaw", "skills");
    const skillDir = join(openclawSkillsDir, skillName);

    // Create .openclaw/skills directory if it doesn't exist
    if (!existsSync(openclawSkillsDir)) {
      mkdirSync(openclawSkillsDir, { recursive: true });
    }

    // Extract ZIP file
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipBuffer);

    // Extract all files
    const extractPromises: Promise<void>[] = [];
    zipData.forEach((relativePath, file) => {
      if (file.dir) {
        // Create directory
        const dirPath = join(skillDir, relativePath);
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
        }
      } else {
        // Extract file
        extractPromises.push(
          file.async("nodebuffer").then((content) => {
            const filePath = join(skillDir, relativePath);
            const fileDir = dirname(filePath);
            if (!existsSync(fileDir)) {
              mkdirSync(fileDir, { recursive: true });
            }
            writeFileSync(filePath, content);
          })
        );
      }
    });

    await Promise.all(extractPromises);

    // Verify SKILL.md exists
    const skillMdPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      return {
        success: false,
        path: skillDir,
        error: "SKILL.md not found in extracted ZIP",
      };
    }

    return {
      success: true,
      path: skillDir,
    };
  } catch (error) {
    return {
      success: false,
      path: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate installation instructions for OpenClaw
 */
export function generateOpenClawInstallInstructions(
  skillName: string,
  zipPath?: string
): string {
  const instructions = `
# Installing "${skillName}" into OpenClaw

## Option 1: Automatic Installation (Recommended)

If you have the .skills file, you can use our installer:

\`\`\`bash
# Download the .skills file
curl -O <download-url>

# Install using our CLI (if available)
npx skilledclaws install <skill-name>.skills
\`\`\`

## Option 2: Manual Installation

1. Extract the .skills ZIP file:
   \`\`\`bash
   unzip ${skillName}.skills -d /tmp/${skillName}
   \`\`\`

2. Copy to OpenClaw skills directory:
   \`\`\`bash
   # For shared installation (all agents):
   cp -r /tmp/${skillName} ~/.openclaw/skills/
   
   # OR for workspace-specific installation:
   cp -r /tmp/${skillName} <your-workspace>/skills/
   \`\`\`

3. Restart OpenClaw or refresh skills:
   - In the UI: Settings → Skills → Refresh
   - Or restart the gateway

## Option 3: Using ClawHub (Future)

Once published to ClawHub:
\`\`\`bash
clawhub install ${skillName}
\`\`\`

## Verification

After installation, verify the skill is loaded:
\`\`\`bash
# Check if SKILL.md exists
ls -la ~/.openclaw/skills/${skillName}/SKILL.md
\`\`\`

The skill should appear in OpenClaw's skills list on the next session.
`;

  return instructions.trim();
}
