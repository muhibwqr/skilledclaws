"use client";

import { useEffect, useState } from "react";
import { getRecommendations, type SimilarSkill } from "@/lib/api";
import { Card } from "@skilledclaws/ui";

export interface SkillRecommendationsProps {
  skillId: string | null;
  onSkillClick?: (skillId: string) => void;
}

export function SkillRecommendations({ skillId, onSkillClick }: SkillRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<SimilarSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!skillId) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    setError(null);

    getRecommendations(skillId)
      .then((recs) => {
        setRecommendations(recs);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load recommendations");
        console.error("Failed to load recommendations:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [skillId]);

  if (!skillId) {
    return null;
  }

  return (
    <div 
      className="w-[360px] bg-[#0a0a0a] border border-[#1a1a1a] text-[#f5f5f5]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="p-5 border-b border-[#1a1a1a]">
        <h3 className="text-sm font-medium uppercase tracking-wider text-[#f5f5f5]">
          Similar Skills
        </h3>
      </div>
      
      <div className="max-h-[600px] overflow-y-auto">
        {loading && (
          <div className="p-5">
            <p className="text-xs text-[#a0a0a0]">Loading recommendations...</p>
          </div>
        )}
        
        {error && (
          <div className="p-5">
            <p className="text-xs text-[#a0a0a0]">{error}</p>
          </div>
        )}
        
        {!loading && !error && recommendations.length === 0 && (
          <div className="p-5">
            <p className="text-xs text-[#666666]">No similar skills found.</p>
          </div>
        )}
        
        {!loading && !error && recommendations.length > 0 && (
          <div className="divide-y divide-[#1a1a1a]">
            {recommendations.map((skill) => (
              <div
                key={skill.id}
                className="p-4 hover:bg-[#141414] cursor-pointer transition-colors duration-150 group"
                onClick={() => onSkillClick?.(skill.id)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-medium text-[#f5f5f5] group-hover:text-white transition-colors flex-1 line-clamp-1">
                    {skill.name}
                  </h4>
                  <span
                    className={`
                      text-[10px]
                      font-medium
                      uppercase
                      tracking-wider
                      px-2
                      py-0.5
                      ${
                        skill.source === "generated" 
                          ? "bg-[#1a1a1a] text-[#a0a0a0]" 
                          : "bg-[#141414] text-[#888888]"
                      }
                      border
                      border-[#1a1a1a]
                    `}
                  >
                    {skill.source === "generated" ? "New" : "Repo"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#a0a0a0] line-clamp-2 mb-3">
                  {skill.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#666666] font-medium">
                    {Math.round(skill.similarity * 100)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
