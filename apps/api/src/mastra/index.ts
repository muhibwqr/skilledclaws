import { Mastra } from "@mastra/core";
import { skillBuilderAgent } from "./agents/skill-builder.js";

export const mastra = new Mastra({
  agents: { skillBuilderAgent },
});
