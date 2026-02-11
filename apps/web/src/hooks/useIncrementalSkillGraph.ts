import { useState, useEffect, useCallback } from "react";
import type { Node, Edge } from "reactflow";
import { getSimilarSkills, getSkillById, type Skill, type SimilarSkill } from "@/lib/api";

export interface SkillNode extends Node {
  data: {
    skill: Skill;
    source: "generated" | "awesome-claude-skills";
  };
}

const SIMILARITY_THRESHOLD = 0.7;
const RECOMMENDATION_COUNT = 5;

export function useIncrementalSkillGraph() {
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [recommendations, setRecommendations] = useState<SimilarSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Add a new skill node to the graph
  const addSkillNode = useCallback(async (skill: Skill, position?: { x: number; y: number }) => {
    try {
      setLoading(true);
      setError(null);

      // Check if node already exists
      setNodes((prev) => {
        if (prev.some((n) => n.id === skill.id)) {
          return prev;
        }
        return prev;
      });

      // Get current nodes BEFORE adding (for connection logic)
      const currentNodes = nodes;
      const currentNodeCount = currentNodes.length;

      // Create node for the new skill
      const newNode: SkillNode = {
        id: skill.id,
        type: "skillNode",
        position: position || {
          x: Math.random() * 400 + 200,
          y: Math.random() * 400 + 200,
        },
        data: {
          skill,
          source: skill.source,
        },
      };

      // Add the new node
      setNodes((prev) => {
        if (prev.some((n) => n.id === skill.id)) {
          return prev;
        }
        return [...prev, newNode];
      });

      // If this is the first node, get recommendations from database
      if (currentNodeCount === 0) {
        try {
          const similar = await getSimilarSkills(skill.id, RECOMMENDATION_COUNT);
          setRecommendations(similar.similar);
        } catch (err) {
          console.warn("Failed to load recommendations:", err);
          setRecommendations([]);
        }
      } else {
        // If we have existing nodes, calculate connections for the new node
        try {
          const similar = await getSimilarSkills(skill.id, 20);
          
          // Get current edges to check for duplicates
          setEdges((prevEdges) => {
            const existingEdgeIds = new Set(prevEdges.map(e => e.id));
            const newEdges: Edge[] = [];
            
            for (const similarSkill of similar.similar) {
              if (similarSkill.similarity >= SIMILARITY_THRESHOLD) {
                // Check if target node exists in our graph
                const targetExists = currentNodes.some((n) => n.id === similarSkill.id);
                if (targetExists) {
                  const edgeId = `${skill.id}-${similarSkill.id}`;
                  // Check if edge already exists
                  if (!existingEdgeIds.has(edgeId)) {
                    newEdges.push({
                      id: edgeId,
                      source: skill.id,
                      target: similarSkill.id,
                      type: "smoothstep",
                      animated: similarSkill.similarity > 0.85,
                      style: {
                        strokeWidth: Math.max(1, Math.min(3, similarSkill.similarity * 3)),
                        opacity: Math.max(0.4, Math.min(0.9, similarSkill.similarity * 0.8)),
                        stroke: similarSkill.similarity > 0.85 ? '#4a4a4a' : '#2a2a2a',
                      },
                      data: {
                        similarity: similarSkill.similarity,
                      },
                    });
                  }
                }
              }
            }

            return newEdges.length > 0 ? [...prevEdges, ...newEdges] : prevEdges;
          });
        } catch (err) {
          console.warn("Failed to calculate connections:", err);
        }
      }

      // Clear recommendations after adding
      setRecommendations([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add skill";
      setError(errorMessage);
      console.error("Failed to add skill:", err);
    } finally {
      setLoading(false);
    }
  }, [nodes, edges]);

  // Add a recommended skill from the database
  const addRecommendedSkill = useCallback(async (skillId: string) => {
    try {
      setLoading(true);
      const skill = await getSkillById(skillId);
      if (!skill) {
        throw new Error("Skill not found");
      }

      await addSkillNode(skill);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recommended skill");
    } finally {
      setLoading(false);
    }
  }, [addSkillNode]);

  // Remove a node
  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedSkillId === nodeId) {
      setSelectedSkillId(null);
    }
  }, [selectedSkillId]);

  // Clear all nodes
  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setRecommendations([]);
    setSelectedSkillId(null);
  }, []);

  return {
    nodes,
    edges,
    recommendations,
    loading,
    error,
    selectedSkillId,
    setSelectedSkillId,
    addSkillNode,
    addRecommendedSkill,
    removeNode,
    clearGraph,
  };
}
