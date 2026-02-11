import { Agent } from "@mastra/core/agent";

export const skillBuilderAgent = new Agent({
  id: "skill-builder",
  name: "Skill Builder",
  instructions: `You are a research agent. Given a skill or trade name, identify relevant trends (names and short descriptions) and geographic hotspots (cities/regions where this skill is in demand) with approximate lat/lng. Reply only with the requested JSON structure.`,
  model: "openai/gpt-4o-mini",
  tools: {},
});
