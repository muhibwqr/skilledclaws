import { Agent } from "@mastra/core/agent";

export const skillBuilderAgent = new Agent({
  id: "skill-builder",
  name: "Skill Builder",
  instructions: "You are a research agent. Given a skill or trade name, research common practices, successful strategies, and geographic trends. Return structured data for skill synthesis and trend locations.",
  model: "openai/gpt-4o-mini",
  tools: {},
});
