"use client";

import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useSkillGraph, type SkillNode } from "@/hooks/useSkillGraph";
import { SkillNodeComponent } from "./SkillNode";
import { SkillRecommendations } from "./SkillRecommendations";
import { SearchBar } from "@skilledclaws/ui";

export interface SkillGraphProps {
  onSkillClick?: (skillId: string) => void;
  onGenerateClick?: (skillName: string) => void;
}

export function SkillGraph({ onSkillClick, onGenerateClick }: SkillGraphProps) {
  const {
    nodes,
    edges,
    loading,
    error,
    selectedSkillId,
    setSelectedSkillId,
    filterBySource,
    searchSkills,
  } = useSkillGraph();

  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "generated" | "awesome-claude-skills">("all");

  // Memoize nodeTypes to prevent React Flow warnings
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      skillNode: SkillNodeComponent,
    }),
    []
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const skillNode = node as SkillNode;
      setSelectedSkillId(skillNode.id);
      onSkillClick?.(skillNode.id);
    },
    [onSkillClick, setSelectedSkillId]
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        searchSkills(query);
      } else {
        filterBySource();
      }
    },
    [searchSkills, filterBySource]
  );

  const handleFilterClick = useCallback(
    (filter: "all" | "generated" | "awesome-claude-skills") => {
      setActiveFilter(filter);
      if (filter === "all") {
        filterBySource();
      } else {
        filterBySource(filter);
      }
    },
    [filterBySource]
  );

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
              <div className="text-xs text-[#666666] uppercase tracking-wider">
                {nodes.length} {nodes.length === 1 ? "skill" : "skills"}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex-1 max-w-lg">
              <SearchBar
                value={searchValue}
                onChange={setSearchValue}
                onSearch={handleSearch}
                placeholder="Search skills..."
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-1 border-l border-[#1a1a1a] pl-6">
              <button
                onClick={() => handleFilterClick("all")}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  activeFilter === "all"
                    ? "text-[#f5f5f5] bg-[#141414]"
                    : "text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterClick("generated")}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  activeFilter === "generated"
                    ? "text-[#f5f5f5] bg-[#141414]"
                    : "text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414]"
                }`}
              >
                Generated
              </button>
              <button
                onClick={() => handleFilterClick("awesome-claude-skills")}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  activeFilter === "awesome-claude-skills"
                    ? "text-[#f5f5f5] bg-[#141414]"
                    : "text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414]"
                }`}
              >
                Repository
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations panel */}
      {selectedSkillId && (
        <div className="absolute top-[120px] right-6 z-10">
          <SkillRecommendations skillId={selectedSkillId} onSkillClick={onSkillClick} />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="w-1 h-1 bg-[#f5f5f5] animate-pulse mx-auto"></div>
            <p className="text-sm text-[#a0a0a0] font-medium tracking-wide">Loading skills</p>
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
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={(_event, node) => {
            // Highlight connected edges on hover
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
            // Reset edge styles
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
            style: { stroke: '#2a2a2a', strokeWidth: 1, opacity: 0.4 },
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
}
