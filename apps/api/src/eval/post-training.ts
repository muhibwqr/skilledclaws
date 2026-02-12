import { skillSynthesisAgent } from "../mastra/agents/index.js";
import type { SkillBuildInput } from "@skilledclaws/skills-engine";

interface EvaluationResult {
  skillName: string;
  quality: number; // 0-1
  issues: string[];
  suggestions: string[];
}

export async function evaluateSkillGeneration(skillName: string, output: SkillBuildInput): Promise<EvaluationResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let quality = 1.0;

  // Check description quality
  if (!output.description || output.description.length < 50) {
    issues.push("Description too short");
    quality -= 0.2;
    suggestions.push("Add more detailed description (50+ chars)");
  }

  // Check triggers
  if (!output.triggers || output.triggers.length < 3) {
    issues.push("Not enough trigger phrases");
    quality -= 0.15;
    suggestions.push("Add at least 3 trigger phrases");
  }

  // Check strategies
  if (!output.strategies || output.strategies.length < 2) {
    issues.push("Not enough strategies");
    quality -= 0.2;
    suggestions.push("Add at least 2 strategy documents");
  }

  // Check strategy content quality
  if (output.strategies) {
    const shortStrategies = output.strategies.filter((s: { content?: string }) => !s.content || s.content.length < 100);
    if (shortStrategies.length > 0) {
      issues.push(`${shortStrategies.length} strategy(ies) too short`);
      quality -= 0.1 * shortStrategies.length;
      suggestions.push("Each strategy should have 100+ chars of content");
    }
  }

  quality = Math.max(0, quality);

  return { skillName, quality, issues, suggestions };
}

export async function evaluateSearchResults(query: string, trends: Array<{ name: string; description?: string }>, locations: Array<{ name: string; lat: number; lng: number }>): Promise<EvaluationResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let quality = 1.0;

  if (trends.length === 0) {
    issues.push("No trends returned");
    quality -= 0.4;
    suggestions.push("Must return at least 3-5 trends");
  } else if (trends.length < 3) {
    issues.push("Too few trends");
    quality -= 0.2;
    suggestions.push("Return 3-5 trends minimum");
  }

  if (locations.length === 0) {
    issues.push("No locations returned");
    quality -= 0.4;
    suggestions.push("Must return at least 5-10 locations with coordinates");
  } else if (locations.length < 5) {
    issues.push("Too few locations");
    quality -= 0.2;
    suggestions.push("Return 5-10 locations minimum");
  }

  // Validate coordinates
  const invalidCoords = locations.filter(loc => 
    loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180
  );
  if (invalidCoords.length > 0) {
    issues.push(`${invalidCoords.length} location(s) have invalid coordinates`);
    quality -= 0.1;
    suggestions.push("Ensure lat is -90 to 90, lng is -180 to 180");
  }

  quality = Math.max(0, quality);

  return { skillName: query, quality, issues, suggestions };
}

export async function runPostTrainingEvaluation(): Promise<void> {
  // Evaluate recent skill generations
  // This would typically run on webhook completion
  console.log("Post-training evaluation would run here");
}
