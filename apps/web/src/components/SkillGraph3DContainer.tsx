"use client";

import React, { useCallback, useMemo } from "react";
import { SkillGraph3D } from "./SkillGraph3D";
import { useSkillGraph3D, type SkillNode3D } from "@/hooks/useSkillGraph3D";
import type { Skill } from "@/lib/api";

export interface SkillGraph3DContainerProps {
  onSkillClick?: (skillId: string) => void;
  onGenerateComplete?: (skill: Skill) => void;
}

export interface SkillGraph3DContainerRef {
  addSkillNode: (skill: Skill) => Promise<void>;
  addMultipleSkills: (skills: Skill[]) => Promise<void>;
}

export const SkillGraph3DContainer = React.forwardRef<
  SkillGraph3DContainerRef,
  SkillGraph3DContainerProps
>(({ onSkillClick, onGenerateComplete }, ref) => {
  const {
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
  } = useSkillGraph3D();

  // Convert 3D nodes to graph format
  const graphNodes = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      skill: node.skill,
      position: node.position,
      color: node.color,
    }));
  }, [nodes]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    addSkillNode: async (skill: Skill) => {
      await addSkillNode(skill);
      onGenerateComplete?.(skill);
    },
    addMultipleSkills: async (skills: Skill[]) => {
      await addMultipleSkills(skills);
      if (skills.length > 0) {
        onGenerateComplete?.(skills[0]);
      }
    },
  }), [addSkillNode, addMultipleSkills, onGenerateComplete]);

  const handleNodeClick = useCallback(
    (skillId: string) => {
      onSkillClick?.(skillId);
    },
    [onSkillClick]
  );

  const handleNodeHover = useCallback(
    (skillId: string | null) => {
      setHoveredNodeId(skillId);
    },
    [setHoveredNodeId]
  );

  return (
    <div className="relative w-full h-full bg-black">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-medium text-[#f5f5f5] tracking-tight">SkilledClaws</h1>
              <p className="text-xs text-[#666666] mt-0.5 uppercase tracking-wider">
                Skill Discovery & Generation
              </p>
            </div>
            {nodes.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-xs text-[#666666] uppercase tracking-wider">
                  {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
                </div>
                <button
                  onClick={clearGraph}
                  className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414] transition-colors duration-150"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="w-1 h-1 bg-[#f5f5f5] animate-pulse mx-auto"></div>
            <p className="text-sm text-[#a0a0a0] font-medium tracking-wide">Loading</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute top-[80px] left-6 z-20 bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] px-4 py-3">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* 3D Graph */}
      <div className="pt-[80px] w-full h-full">
        <SkillGraph3D
          nodes={graphNodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
      </div>

      {/* Hover info */}
      {hoveredNodeId && (
        <div className="absolute bottom-6 right-6 z-10 bg-[#0a0a0a] border border-[#1a1a1a] text-[#f5f5f5] p-4 max-w-[300px]">
          {(() => {
            const node = nodes.find((n) => n.id === hoveredNodeId);
            if (!node) return null;
            return (
              <>
                <h3 className="text-sm font-medium mb-2">{node.skill.name}</h3>
                <p className="text-xs text-[#a0a0a0] line-clamp-3">{node.skill.description}</p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
});

SkillGraph3DContainer.displayName = "SkillGraph3DContainer";
