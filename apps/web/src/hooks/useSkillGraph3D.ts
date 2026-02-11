import { useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { getSimilarSkills, getSkillById, type Skill, type SimilarSkill } from "@/lib/api";

export interface SkillNode3D {
  id: string;
  skill: Skill;
  position: THREE.Vector3;
  color: THREE.Color;
}

const SIMILARITY_THRESHOLD = 0.7;

// Generate positions in 3D space
function generatePosition(index: number, total: number): THREE.Vector3 {
  const angle = (index / total) * Math.PI * 2;
  const radius = 10 + (index % 3) * 5;
  const height = (index % 5) * 3 - 6;
  
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    height,
    Math.sin(angle) * radius
  );
}

// Generate color based on skill
function generateColor(skill: Skill): THREE.Color {
  const hue = (skill.name.length * 17) % 360 / 360;
  return new THREE.Color().setHSL(hue, 0.6, 0.5);
}

export function useSkillGraph3D() {
  const [nodes, setNodes] = useState<SkillNode3D[]>([]);
  const [edges, setEdges] = useState<Array<{ from: string; to: string; similarity: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const addSkillNode = useCallback(async (skill: Skill) => {
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

      const currentNodes = nodes;
      const newNode: SkillNode3D = {
        id: skill.id,
        skill,
        position: generatePosition(currentNodes.length, currentNodes.length + 1),
        color: generateColor(skill),
      };

      setNodes((prev) => {
        if (prev.some((n) => n.id === skill.id)) {
          return prev;
        }
        return [...prev, newNode];
      });

      // Find similar nodes and create edges
      if (currentNodes.length > 0) {
        try {
          const similar = await getSimilarSkills(skill.id, 20);
          
          setEdges((prev) => {
            const existingIds = new Set(prev.map(e => `${e.from}-${e.to}`));
            const newEdges: Array<{ from: string; to: string; similarity: number }> = [];
            
            for (const similarSkill of similar.similar) {
              if (similarSkill.similarity >= SIMILARITY_THRESHOLD) {
                const targetExists = currentNodes.some((n) => n.id === similarSkill.id);
                if (targetExists) {
                  const edgeId1 = `${skill.id}-${similarSkill.id}`;
                  const edgeId2 = `${similarSkill.id}-${skill.id}`;
                  
                  if (!existingIds.has(edgeId1) && !existingIds.has(edgeId2)) {
                    newEdges.push({
                      from: skill.id,
                      to: similarSkill.id,
                      similarity: similarSkill.similarity,
                    });
                  }
                }
              }
            }

            return newEdges.length > 0 ? [...prev, ...newEdges] : prev;
          });
        } catch (err) {
          console.warn("Failed to calculate connections:", err);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add skill";
      setError(errorMessage);
      console.error("Failed to add skill:", err);
    } finally {
      setLoading(false);
    }
  }, [nodes]);

  const addMultipleSkills = useCallback(async (skills: Skill[]) => {
    try {
      setLoading(true);
      setError(null);

      const newNodes: SkillNode3D[] = skills.map((skill, index) => ({
        id: skill.id,
        skill,
        position: generatePosition(nodes.length + index, nodes.length + skills.length),
        color: generateColor(skill),
      }));

      setNodes((prev) => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNewNodes = newNodes.filter(n => !existingIds.has(n.id));
        return [...prev, ...uniqueNewNodes];
      });

      // Calculate connections between all new nodes and existing nodes
      const allNodes = [...nodes, ...newNodes];
      const newEdges: Array<{ from: string; to: string; similarity: number }> = [];

      for (const newNode of newNodes) {
        try {
          const similar = await getSimilarSkills(newNode.id, 20);
          
          for (const similarSkill of similar.similar) {
            if (similarSkill.similarity >= SIMILARITY_THRESHOLD) {
              const targetExists = allNodes.some((n) => n.id === similarSkill.id);
              if (targetExists && similarSkill.id !== newNode.id) {
                newEdges.push({
                  from: newNode.id,
                  to: similarSkill.id,
                  similarity: similarSkill.similarity,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to get similarities for ${newNode.id}:`, err);
        }
      }

      if (newEdges.length > 0) {
        setEdges((prev) => {
          const existingIds = new Set(prev.map(e => `${e.from}-${e.to}`));
          const uniqueNewEdges = newEdges.filter(
            e => !existingIds.has(`${e.from}-${e.to}`) && !existingIds.has(`${e.to}-${e.from}`)
          );
          return [...prev, ...uniqueNewEdges];
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add skills";
      setError(errorMessage);
      console.error("Failed to add skills:", err);
    } finally {
      setLoading(false);
    }
  }, [nodes]);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
  }, []);

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setHoveredNodeId(null);
  }, []);

  return {
    nodes,
    edges,
    loading,
    error,
    hoveredNodeId,
    setHoveredNodeId,
    addSkillNode,
    addMultipleSkills,
    removeNode,
    clearGraph,
  };
}
