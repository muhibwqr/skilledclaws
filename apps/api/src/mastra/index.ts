import { Mastra } from "@mastra/core";
import { skillSynthesisAgent } from "./agents/skill-synthesis.js";

export const mastra = new Mastra({
  agents: { skillSynthesisAgent },
});
