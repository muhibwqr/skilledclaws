import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export const DotNodeComponent = memo(({ selected }: NodeProps) => {
  return (
    <div
      className={`
        relative
        w-3
        h-3
        ${selected ? "bg-[#f5f5f5]" : "bg-[#404040]"}
        transition-all
        duration-300
        ${selected ? "scale-150" : "scale-100"}
        ${selected ? "shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}
      `}
      style={{
        borderRadius: "50%",
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-1 !h-1 !bg-[#2a2a2a] !border-[#1a1a1a]"
        style={{ borderWidth: '1px' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-1 !h-1 !bg-[#2a2a2a] !border-[#1a1a1a]"
        style={{ borderWidth: '1px' }}
      />
    </div>
  );
});

DotNodeComponent.displayName = "DotNode";
