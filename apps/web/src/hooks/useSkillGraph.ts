import { useState, useEffect, useCallback } from "react";
import type { Node, Edge } from "reactflow";
import { getAllSkills, getSimilarSkills, type Skill, type SimilarSkill } from "@/lib/api";

export interface SkillNode extends Node {
  data: {
    skill: Skill;
    source: "generated" | "awesome-claude-skills";
  };
}

const SIMILARITY_THRESHOLD = 0.7; // Only show edges for similarity >= 0.7

export function useSkillGraph() {
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Load all skills
  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllSkills(200); // Load up to 200 skills
      const skills = response.skills;

      // Create nodes with better initial positioning (force-directed layout simulation)
      const newNodes: SkillNode[] = skills.map((skill, index) => {
        // Use a more structured layout - distribute in a grid-like pattern with some randomness
        const cols = Math.ceil(Math.sqrt(skills.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        const baseX = (col - cols / 2) * 300;
        const baseY = (row - skills.length / cols / 2) * 200;
        const jitter = 50; // Add some randomness
        
        return {
          id: skill.id,
          type: "skillNode",
          position: {
            x: baseX + (Math.random() - 0.5) * jitter,
            y: baseY + (Math.random() - 0.5) * jitter,
          },
          data: {
            skill: skill as Skill,
            source: skill.source,
          },
        };
      });

      setNodes(newNodes);

      // Load similarity edges (for a subset to avoid too many API calls)
      // We'll load edges for the first 20 nodes to keep it manageable
      const nodesToProcess = newNodes.slice(0, 20);
      const newEdges: Edge[] = [];

      for (const node of nodesToProcess) {
        try {
          const similar = await getSimilarSkills(node.id, 5);
          for (const similarSkill of similar.similar) {
            if (similarSkill.similarity >= SIMILARITY_THRESHOLD) {
              // Check if edge already exists (avoid duplicates)
              const edgeExists = newEdges.some(
                (e) =>
                  (e.source === node.id && e.target === similarSkill.id) ||
                  (e.source === similarSkill.id && e.target === node.id)
              );

              if (!edgeExists) {
                newEdges.push({
                  id: `${node.id}-${similarSkill.id}`,
                  source: node.id,
                  target: similarSkill.id,
                  type: "smoothstep",
                  animated: similarSkill.similarity > 0.85, // Only animate very strong connections
                  style: {
                    strokeWidth: Math.max(1, similarSkill.similarity * 2.5),
                    opacity: Math.max(0.3, similarSkill.similarity * 0.6), // More subtle edges
                    stroke: similarSkill.similarity > 0.85 ? '#3a3a3a' : '#2a2a2a',
                  },
                  data: {
                    similarity: similarSkill.similarity,
                  },
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to load similarities for ${node.id}:`, err);
        }
      }

      setEdges(newEdges);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load skills";
      setError(errorMessage);
      console.error("Failed to load skills:", err);
      if (err instanceof Error && err.message.includes("Supabase")) {
        console.error("Supabase may not be configured. Check API server logs.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Filter nodes by source
  const filterBySource = useCallback(
    (source?: "generated" | "awesome-claude-skills") => {
      if (!source) {
        loadSkills();
        return;
      }

      getAllSkills(200, 0, source)
        .then((response) => {
          const skills = response.skills;
          const filteredNodes: SkillNode[] = skills.map((skill, index) => ({
            id: skill.id,
            type: "skillNode",
            position: {
              x: Math.random() * 1000,
              y: Math.random() * 1000,
            },
            data: {
              skill: skill as Skill,
              source: skill.source,
            },
          }));

          setNodes(filteredNodes);
          // Recalculate edges for filtered nodes
          setEdges([]);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to filter skills");
        });
    },
    [loadSkills]
  );

  // Search skills
  const searchSkills = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadSkills();
      return;
    }

    try {
      setLoading(true);
      const { searchSkills: searchFn } = await import("@/lib/api");
      const results = await searchFn(query, 20);

      const searchNodes: SkillNode[] = results.results.map((skill, index) => ({
        id: skill.id,
        type: "skillNode",
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        },
        data: {
          skill: {
            id: skill.id,
            name: skill.name,
            description: skill.description,
            triggers: [],
            source: skill.source,
            created_at: "",
            updated_at: "",
          } as Skill,
          source: skill.source,
        },
      }));

      setNodes(searchNodes);
      setEdges([]); // Clear edges for search results
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search skills");
    } finally {
      setLoading(false);
    }
  }, [loadSkills]);

  return {
    nodes,
    edges,
    loading,
    error,
    selectedSkillId,
    setSelectedSkillId,
    filterBySource,
    searchSkills,
    reload: loadSkills,
  };
}
