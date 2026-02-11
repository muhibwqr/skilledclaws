export interface SkillManifest {
  name: string;
  description: string;
  triggers: string[];
  version: string;
  layers: SkillLayer[];
}

export interface SkillLayer {
  id: string;
  name: string;
  description: string;
  type: "scripts" | "references" | "assets";
}

export interface SkillBuildInput {
  skillName: string;
  description: string;
  triggers: string[];
  researchSummary?: string;
  strategies: Array<{ title: string; content: string }>;
  promptTemplates?: Array<{ id: string; name: string; template: string }>;
  scriptLogic?: { language: "python" | "typescript"; code: string };
}

export interface GeoJsonPoint {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonPoint[];
}
