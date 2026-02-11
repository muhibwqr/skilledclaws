import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { SkillNode } from "@/hooks/useSkillGraph";

export const SkillNodeComponent = memo(({ data, selected }: NodeProps<SkillNode["data"]>) => {
  const { skill, source } = data;
  const isGenerated = source === "generated";

  return (
    <div
      className={`
        relative
        bg-[#1a1a1a]
        border
        ${selected ? "border-[#505050]" : "border-[#2a2a2a]"}
        text-[#f5f5f5]
        min-w-[240px]
        max-w-[280px]
        cursor-pointer
        transition-all
        duration-200
        ease-out
        hover:border-[#4a4a4a]
        hover:bg-[#222222]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.6)]
        ${selected ? "shadow-[0_0_0_2px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.7)]" : ""}
        group
      `}
      style={{ borderRadius: 0 }}
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2 !h-2 !bg-[#2a2a2a] !border-[#1a1a1a] group-hover:!bg-[#3a3a3a] transition-colors"
        style={{ borderWidth: '1px' }}
      />
      
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium leading-snug text-[#f5f5f5] line-clamp-2 flex-1 group-hover:text-white transition-colors">
            {skill.name}
          </h3>
          <span 
            className={`
              text-[10px]
              font-medium
              uppercase
              tracking-wider
              px-2
              py-0.5
              transition-colors
              ${isGenerated ? "bg-[#1a1a1a] text-[#a0a0a0] group-hover:bg-[#2a2a2a]" : "bg-[#141414] text-[#888888] group-hover:bg-[#1f1f1f]"}
              border
              border-[#1a1a1a]
            `}
          >
            {isGenerated ? "New" : "Repo"}
          </span>
        </div>
        
        <p className="text-xs leading-relaxed text-[#a0a0a0] line-clamp-3 group-hover:text-[#b0b0b0] transition-colors">
          {skill.description}
        </p>
        
        {skill.triggers.length > 0 && (
          <div className="pt-2 border-t border-[#1a1a1a] group-hover:border-[#2a2a2a] transition-colors">
            <div className="text-[10px] uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
              Triggers
            </div>
            <div className="text-xs text-[#888888] line-clamp-2 group-hover:text-[#999999] transition-colors">
              {skill.triggers.slice(0, 2).join(" • ")}
              {skill.triggers.length > 2 && "..."}
            </div>
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2 !h-2 !bg-[#2a2a2a] !border-[#1a1a1a] group-hover:!bg-[#3a3a3a] transition-colors"
        style={{ borderWidth: '1px' }}
      />
    </div>
  );
});

SkillNodeComponent.displayName = "SkillNode";
