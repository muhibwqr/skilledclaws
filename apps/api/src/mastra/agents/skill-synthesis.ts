import { Agent } from "@mastra/core/agent";

export const skillSynthesisAgent = new Agent({
  id: "skill-synthesis",
  name: "Skill Synthesis",
  instructions: `You generate full .skills pack content for Clawdbot. Given a skill or trade name, produce: a clear description, 3-5 trigger phrases users might say to activate this skill, 2-4 strategy documents (title + content with actionable advice), and optionally prompt templates (id, name, template text). Return only valid JSON matching the required schema.`,
  model: "openai/gpt-4o", // use gpt-4o for quality; can switch to anthropic/claude-3-5-sonnet-20241022
  tools: {},
});
