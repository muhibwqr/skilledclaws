import { Mastra } from "@mastra/core";
import { skillBuilderAgent } from "./agents/skill-builder.js";
import { skillSynthesisAgent } from "./agents/skill-synthesis.js";

export const mastra = new Mastra({
  agents: { skillBuilderAgent, skillSynthesisAgent },
});
