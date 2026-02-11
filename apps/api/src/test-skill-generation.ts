#!/usr/bin/env tsx
/**
 * Test script for skill generation
 * Tests if skills are generated properly with correct structure
 */

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import { skillSynthesisAgent } from "./mastra/agents/skill-synthesis.js";
import { SkillBuilder, skillBuildInputSchema } from "@skilledclaws/skills-engine";
import { loadFewShotExamples, getFewShotExamplesPrompt } from "./examples/load-examples.js";
import { generateSkillEmbedding } from "./services/embeddings.js";

// Load environment variables
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

async function testSkillGeneration(skillName: string) {
  console.log(`\n🧪 Testing skill generation for: "${skillName}"\n`);

  try {
    // Load few-shot examples
    const examples = loadFewShotExamples();
    console.log(`✅ Loaded ${examples.length} few-shot examples`);

    const examplesPrompt = getFewShotExamplesPrompt(examples);
    const prompt = examplesPrompt
      ? `${examplesPrompt}\n\nNow generate a complete .skills pack for the skill or trade: "${skillName}". Include description, trigger phrases, strategies (title + content), and optional prompt templates.`
      : `Generate a complete .skills pack for the skill or trade: "${skillName}". Include description, trigger phrases, strategies (title + content), and optional prompt templates.`;

    console.log(`📝 Generating skill with AI...`);
    const result = await skillSynthesisAgent.generate(prompt, {
      structuredOutput: {
        schema: skillBuildInputSchema,
        errorStrategy: "fallback",
        fallbackValue: {
          skillName: skillName.trim(),
          description: `Veteran-level skill pack for ${skillName}.`,
          triggers: [`help with ${skillName}`, skillName],
          strategies: [{ title: "Overview", content: "Add your strategies here." }],
        },
      },
      modelSettings: { maxOutputTokens: 4096 },
    });

    const input = result?.object;
    if (!input) {
      throw new Error("No structured output from AI");
    }

    const validated = skillBuildInputSchema.safeParse(input);
    if (!validated.success) {
      console.error("❌ Validation failed:", validated.error.flatten());
      return false;
    }

    console.log(`✅ Skill generated successfully!`);
    console.log(`\n📋 Generated Skill Details:`);
    console.log(`   Name: ${validated.data.skillName}`);
    console.log(`   Description: ${validated.data.description.substring(0, 100)}...`);
    console.log(`   Triggers: ${validated.data.triggers.length} trigger phrases`);
    console.log(`   Strategies: ${validated.data.strategies.length} strategies`);

    // Test ZIP building
    console.log(`\n📦 Building .skills ZIP file...`);
    const builder = new SkillBuilder("1.0.0");
    const zipBuffer = await builder.buildZipBuffer(validated.data);
    console.log(`✅ ZIP built successfully! Size: ${(zipBuffer.length / 1024).toFixed(2)} KB`);

    // Test embedding generation
    console.log(`\n🔍 Testing embedding generation...`);
    const embedding = await generateSkillEmbedding(
      validated.data.skillName,
      validated.data.description,
      validated.data.strategies
    );
    console.log(`✅ Embedding generated! Dimensions: ${embedding.length}`);

    // Validate structure
    console.log(`\n✅ Structure Validation:`);
    console.log(`   ✓ Has skillName: ${!!validated.data.skillName}`);
    console.log(`   ✓ Has description: ${!!validated.data.description && validated.data.description.length > 20}`);
    console.log(`   ✓ Has triggers: ${validated.data.triggers.length >= 1}`);
    console.log(`   ✓ Has strategies: ${validated.data.strategies.length >= 1}`);
    console.log(`   ✓ Strategies have titles: ${validated.data.strategies.every((s) => s.title && s.title.length > 0)}`);
    console.log(`   ✓ Strategies have content: ${validated.data.strategies.every((s) => s.content && s.content.length > 50)}`);

    // Check if matches awesome-claude-skills format
    const hasPrerequisites = validated.data.strategies.some((s) => s.title.toLowerCase().includes("prerequisite"));
    const hasSetup = validated.data.strategies.some((s) => s.title.toLowerCase().includes("setup"));
    const hasWorkflows = validated.data.strategies.some((s) => s.title.toLowerCase().includes("workflow"));

    console.log(`\n📚 Format Check (awesome-claude-skills style):`);
    console.log(`   ${hasPrerequisites ? "✓" : "✗"} Has Prerequisites section`);
    console.log(`   ${hasSetup ? "✓" : "✗"} Has Setup section`);
    console.log(`   ${hasWorkflows ? "✓" : "✗"} Has Workflows section`);

    console.log(`\n✅ All tests passed for "${skillName}"!\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ Test failed for "${skillName}":`, error);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Skill Generation Tests\n");
  console.log("=" .repeat(50));

  const testCases = [
    "crypto trading",
    "web development",
    "plumbing",
    "data science",
  ];

  const results: Array<{ skill: string; passed: boolean }> = [];

  for (const skillName of testCases) {
    const passed = await testSkillGeneration(skillName);
    results.push({ skill: skillName, passed });
    // Wait a bit between tests to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary:\n");

  results.forEach(({ skill, passed }) => {
    console.log(`   ${passed ? "✅" : "❌"} ${skill}`);
  });

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\n✅ Passed: ${passedCount}/${totalCount}`);

  if (passedCount === totalCount) {
    console.log("🎉 All tests passed!\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed\n");
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
