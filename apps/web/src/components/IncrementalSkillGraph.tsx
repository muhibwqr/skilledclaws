"use client";

import React, { useCallback, useMemo, useState, useEffect, useImperativeHandle } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useIncrementalSkillGraph, type SkillNode } from "@/hooks/useIncrementalSkillGraph";
import { SkillNodeComponent } from "./SkillNode";
import { DotNodeComponent } from "./DotNode";
import type { Skill } from "@/lib/api";
import { getSkillById } from "@/lib/api";

export interface IncrementalSkillGraphProps {
  onSkillClick?: (skillId: string) => void;
  onGenerateComplete?: (skill: Skill) => void;
}

export interface IncrementalSkillGraphRef {
  addSkillNode: (skill: Skill) => Promise<void>;
  addMultipleSkills: (skills: Skill[]) => Promise<void>;
}

export const IncrementalSkillGraph = React.forwardRef<IncrementalSkillGraphRef, IncrementalSkillGraphProps>(
  ({ onSkillClick, onGenerateComplete }, ref) => {
  const {
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
  } = useIncrementalSkillGraph();

  // Generate dots for empty state
  const dotNodes = useMemo(() => {
    const dots: Node[] = [];
    const cols = 8;
    const rows = 6;
    const spacing = 120;
    const startX = 200;
    const startY = 200;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        dots.push({
          id: `dot-${row}-${col}`,
          type: "dotNode",
          position: {
            x: startX + col * spacing,
            y: startY + row * spacing,
          },
          data: {},
        });
      }
    }
    return dots;
  }, []);

  // Memoize nodeTypes
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      skillNode: SkillNodeComponent,
      dotNode: DotNodeComponent,
    }),
    []
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "dotNode") return;
      
      const skillNode = node as SkillNode;
      setSelectedSkillId(skillNode.id);
      onSkillClick?.(skillNode.id);
    },
    [onSkillClick, setSelectedSkillId]
  );

  // Expose addSkillNode and addMultipleSkills to parent via ref
  useImperativeHandle(ref, () => ({
    addSkillNode: async (skill: Skill) => {
      await addSkillNode(skill);
      onGenerateComplete?.(skill);
    },
    addMultipleSkills: async (skills: Skill[]) => {
      // Add all skills sequentially
      for (const skill of skills) {
        await addSkillNode(skill);
      }
      if (skills.length > 0) {
        onGenerateComplete?.(skills[0]);
      }
    },
  }), [addSkillNode, onGenerateComplete]);

  // Show dots when no skills, show skills when they exist
  const displayNodes = nodes.length > 0 ? nodes : dotNodes;
  const displayEdges = nodes.length > 0 ? edges : [];

  return (
    <div className="relative w-full h-full bg-black">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-base font-medium text-[#f5f5f5] tracking-tight">SkilledClaws</h1>
              <p className="text-xs text-[#666666] mt-0.5 uppercase tracking-wider">
                Skill Discovery & Generation
              </p>
            </div>
            {nodes.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-xs text-[#666666] uppercase tracking-wider">
                  {nodes.length} {nodes.length === 1 ? "skill" : "skills"}
                </div>
                <button
                  onClick={async () => {
                    // Export all skills as ZIP
                    try {
                      const skillIds = nodes.map(n => n.id);
                      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                      
                      const response = await fetch(`${API_URL}/api/export`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ skillIds, format: "zip" }),
                      });
                      
                      if (!response.ok) {
                        throw new Error("Failed to export");
                      }
                      
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `skilledclaws-export-${Date.now()}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Failed to export:", err);
                      alert("Failed to export skills");
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414] transition-colors duration-150"
                >
                  Export
                </button>
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

      {/* Recommendations panel - shown when first skill is generated */}
      {recommendations.length > 0 && (
        <div className="absolute top-[120px] right-6 z-10 w-[320px] bg-[#0a0a0a] border border-[#1a1a1a]">
          <div className="p-4 border-b border-[#1a1a1a]">
            <h3 className="text-sm font-medium uppercase tracking-wider text-[#f5f5f5]">
              Recommended Skills
            </h3>
            <p className="text-xs text-[#a0a0a0] mt-1">
              Based on your first skill
            </p>
          </div>
          <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
            {recommendations.map((rec) => (
              <button
                key={rec.id}
                onClick={() => addRecommendedSkill(rec.id)}
                className="w-full text-left p-3 bg-[#000000] border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] transition-colors duration-150"
              >
                <div className="text-sm font-medium text-[#f5f5f5]">{rec.name}</div>
                <div className="text-xs text-[#a0a0a0] mt-1 line-clamp-2">{rec.description}</div>
                <div className="text-[10px] text-[#666666] mt-2 uppercase tracking-wider">
                  Similarity: {(rec.similarity * 100).toFixed(0)}%
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
        <div className="absolute top-[120px] left-6 z-20 bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] px-4 py-3">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Graph Canvas */}
      <div 
        className="pt-[120px] w-full relative"
        style={{ height: 'calc(100vh - 120px)', width: '100%' }}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={(_event, node) => {
            if (node.type === "dotNode") return;
            const connectedEdges = edges.filter(
              (e) => e.source === node.id || e.target === node.id
            );
            connectedEdges.forEach((edge) => {
              const edgeElement = document.querySelector(
                `[data-id="${edge.id}"]`
              ) as HTMLElement;
              if (edgeElement) {
                edgeElement.style.opacity = '0.8';
                edgeElement.style.strokeWidth = '2px';
              }
            });
          }}
          onNodeMouseLeave={(_event, node) => {
            if (node.type === "dotNode") return;
            const connectedEdges = edges.filter(
              (e) => e.source === node.id || e.target === node.id
            );
            connectedEdges.forEach((edge) => {
              const edgeElement = document.querySelector(
                `[data-id="${edge.id}"]`
              ) as HTMLElement;
              if (edgeElement) {
                edgeElement.style.opacity = '';
                edgeElement.style.strokeWidth = '';
              }
            });
          }}
          fitView
          className="bg-black"
          defaultEdgeOptions={{
            style: { stroke: '#2a2a2a', strokeWidth: 1.5, opacity: 0.5 },
            type: 'smoothstep',
            animated: false,
          }}
          connectionLineStyle={{ stroke: '#3a3a3a', strokeWidth: 2, opacity: 0.6 }}
          connectionLineType="smoothstep"
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background 
            color="#0a0a0a" 
            gap={24} 
            size={1}
            variant="dots"
            style={{ opacity: 0.2 }}
          />
          <Controls 
            className="!bg-[#0a0a0a] !border !border-[#1a1a1a]" 
            showInteractive={false}
          />
          <MiniMap 
            nodeColor="#1a1a1a"
            maskColor="rgba(0, 0, 0, 0.9)"
            className="!bg-[#0a0a0a] !border !border-[#1a1a1a]"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
});

IncrementalSkillGraph.displayName = "IncrementalSkillGraph";
