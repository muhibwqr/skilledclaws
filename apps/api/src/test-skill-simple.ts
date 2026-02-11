#!/usr/bin/env tsx
/**
 * Simple test to verify skill generation and ZIP creation
 */

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, writeFileSync } from "fs";
import { SkillBuilder, skillBuildInputSchema } from "@skilledclaws/skills-engine";

// Load environment variables
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

async function testSkillGeneration() {
  console.log("🧪 Testing Skill Generation for 'crypto trading'\n");
  console.log("=".repeat(50) + "\n");

  // Test data matching awesome-claude-skills format
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
        title: "1. Monitor Market Trends",
        content: "**When to use**: Track price movements and market indicators\n\n**Key parameters**:\n- Exchange: Which exchange to monitor\n- Symbols: Trading pairs (BTC/USDT, ETH/USDT)\n- Timeframe: 1m, 5m, 1h, 1d\n\n**Pitfalls**:\n- Don't trade without stop-loss orders\n- Monitor multiple indicators, not just price",
      },
      {
        title: "2. Execute Trades",
        content: "**When to use**: Place buy/sell orders\n\n**Tool sequence**:\n1. Check account balance\n2. Set order parameters\n3. Execute trade\n\n**Key parameters**:\n- Symbol: Trading pair\n- Side: buy or sell\n- Amount: Quantity to trade\n- Price: Limit price (for limit orders)",
      },
    ],
  };

  console.log("1️⃣ Validating skill data structure...");
  const validated = skillBuildInputSchema.parse(testSkill);
  console.log("   ✅ Validation passed\n");

  console.log("2️⃣ Building .skills ZIP file...");
  const builder = new SkillBuilder("1.0.0");
  
  let zipBuffer: Buffer;
  try {
    zipBuffer = await builder.buildZipBuffer(validated);
    console.log(`   ✅ ZIP built successfully!`);
    console.log(`   📦 Size: ${(zipBuffer.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error("   ❌ Failed to build ZIP:", error);
    throw error;
  }

  console.log("3️⃣ Verifying ZIP file signature...");
  // ZIP files start with PK (50 4B in hex)
  const isZip = zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4B;
  console.log(`   ${isZip ? "✅" : "❌"} Valid ZIP signature: ${isZip}\n`);

  console.log("4️⃣ Checking skill data structure...");
  const checks = {
    hasName: !!validated.skillName,
    hasDescription: validated.description.length > 20,
    hasTriggers: validated.triggers.length >= 1,
    hasStrategies: validated.strategies.length >= 2,
    strategiesHaveTitles: validated.strategies.every((s) => s.title && s.title.length > 0),
    strategiesHaveContent: validated.strategies.every((s) => s.content && s.content.length > 50),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    console.log(`   ${passed ? "✅" : "❌"} ${key}: ${passed}`);
  });
  console.log();

  console.log("5️⃣ Format check (awesome-claude-skills style)...");
  const hasPrerequisites = validated.strategies.some((s) => s.title.toLowerCase().includes("prerequisite"));
  const hasSetup = validated.strategies.some((s) => s.title.toLowerCase().includes("setup"));
  const hasWorkflows = validated.strategies.some((s) => !s.title.toLowerCase().includes("prerequisite") && !s.title.toLowerCase().includes("setup"));
  
  console.log(`   ${hasPrerequisites ? "✅" : "⚠️ "} Has Prerequisites section`);
  console.log(`   ${hasSetup ? "✅" : "⚠️ "} Has Setup section`);
  console.log(`   ${hasWorkflows ? "✅" : "⚠️ "} Has Workflows section\n`);

  // Save test file
  const testOutputPath = resolve(process.cwd(), "test-crypto-trading.skills");
  writeFileSync(testOutputPath, zipBuffer);
  console.log(`6️⃣ Test file saved: ${testOutputPath}\n`);

  // Summary
  const allChecksPassed = Object.values(checks).every((v) => v) && isZip;
  console.log("=".repeat(50));
  console.log(allChecksPassed ? "✅ All tests passed!" : "⚠️  Some checks failed");
  console.log("=".repeat(50) + "\n");

  return allChecksPassed;
}

testSkillGeneration()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
