#!/usr/bin/env tsx
/**
 * Quick test to verify .skills ZIP file structure
 */

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, writeFileSync } from "fs";
import { SkillBuilder, skillBuildInputSchema } from "@skilledclaws/skills-engine";
import JSZip from "jszip";

// Load environment variables
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

async function testZipStructure() {
  console.log("🧪 Testing .skills ZIP file structure\n");

  const testSkill = {
    skillName: "crypto-trading",
    description: "Automate cryptocurrency trading tasks: manage trades, monitor market trends, execute orders, and analyze portfolio performance.",
    triggers: ["crypto trading", "cryptocurrency trading", "trade crypto", "manage crypto portfolio"],
    strategies: [
      {
        title: "Prerequisites",
        content: "Requires API keys for your exchange (Binance, Coinbase, etc.) and understanding of trading basics.",
      },
      {
        title: "Setup",
        content: "1. Get API keys from your exchange\n2. Configure trading bot\n3. Set risk management parameters",
      },
      {
        title: "Core Workflows",
        content: "### 1. Monitor Market Trends\n\n**When to use**: Track price movements and market indicators\n\n**Key parameters**:\n- Exchange: Which exchange to monitor\n- Symbols: Trading pairs (BTC/USDT, ETH/USDT)\n- Timeframe: 1m, 5m, 1h, 1d\n\n**Pitfalls**:\n- Don't trade without stop-loss orders\n- Monitor multiple indicators, not just price",
      },
    ],
  };

  const validated = skillBuildInputSchema.parse(testSkill);
  console.log("✅ Test skill data validated\n");

  console.log("📦 Building .skills ZIP file...");
  try {
    const builder = new SkillBuilder("1.0.0");
    const zipBuffer = await builder.buildZipBuffer(validated);
    console.log(`✅ ZIP built! Size: ${(zipBuffer.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error("❌ Failed to build ZIP:", error);
    throw error;
  }

  // Extract and verify ZIP contents
  console.log("📂 Extracting and verifying ZIP contents...\n");
  const zip = await JSZip.loadAsync(zipBuffer);
  const files: string[] = [];

  zip.forEach((relativePath) => {
    files.push(relativePath);
  });

  console.log(`Found ${files.length} files in ZIP:\n`);
  files.forEach((file) => {
    console.log(`  ✓ ${file}`);
  });

  // Verify required files
  const requiredFiles = ["SKILL.md", "scripts/main.ts", "references/", "assets/"];
  const hasRequired = requiredFiles.every((req) => files.some((f) => f.includes(req.split("/")[0])));

  console.log(`\n✅ Required files check: ${hasRequired ? "PASS" : "FAIL"}`);

  // Read and verify SKILL.md content
  if (zip.files["SKILL.md"]) {
    const skillMd = await zip.files["SKILL.md"].async("string");
    console.log("\n📄 SKILL.md content preview:\n");
    console.log(skillMd.substring(0, 500) + "...\n");

    // Check for YAML frontmatter
    const hasFrontmatter = skillMd.startsWith("---");
    const hasName = skillMd.includes("name: crypto-trading");
    const hasDescription = skillMd.includes("description:");

    console.log("📋 SKILL.md format check:");
    console.log(`   ${hasFrontmatter ? "✓" : "✗"} Has YAML frontmatter`);
    console.log(`   ${hasName ? "✓" : "✗"} Has name field`);
    console.log(`   ${hasDescription ? "✓" : "✗"} Has description field`);
  }

  // Save test ZIP for inspection
  const testOutputPath = resolve(process.cwd(), "test-crypto-trading.skills");
  writeFileSync(testOutputPath, zipBuffer);
  console.log(`\n💾 Test ZIP saved to: ${testOutputPath}`);
  console.log("\n✅ ZIP structure test completed!\n");
}

testZipStructure().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
