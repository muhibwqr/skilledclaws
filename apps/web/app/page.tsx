"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SkillGraph3DContainer, type SkillGraph3DContainerRef } from "@/components/SkillGraph3DContainer";
import { getSkillById, type Skill } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generating, setGenerating] = useState(false);
  const [generateInput, setGenerateInput] = useState("");
  const graphRef = useRef<SkillGraph3DContainerRef | null>(null);

  // Handle adding skill from URL parameter
  useEffect(() => {
    const addSkillId = searchParams.get("addSkill");
    if (addSkillId && graphRef.current) {
      getSkillById(addSkillId)
        .then((skill) => {
          if (skill) {
            graphRef.current?.addSkillNode(skill);
            router.replace("/", { scroll: false });
          }
        })
        .catch(console.error);
    }
  }, [searchParams, router]);

  const handleGenerate = useCallback(
    async (skillName: string) => {
      if (!skillName.trim()) return;

      try {
        setGenerating(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skillName: skillName.trim() }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Failed to generate skill" }));
          throw new Error(error.error || "Failed to generate skill");
        }

        const data = await response.json();
        
        // Handle multiple sub-skills being generated
        if (data.subSkills && Array.isArray(data.subSkills) && data.subSkills.length > 0) {
          const skills: Skill[] = data.subSkills.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            triggers: s.triggers || [],
            strategies: s.strategies || [],
            source: "generated",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          
          if (graphRef.current) {
            // Add all sub-skills at once
            await graphRef.current.addMultipleSkills(skills);
          }
          
          alert(`Generated ${skills.length} sub-skills for "${data.mainSkill.name}"`);
        } else if (data.skill && data.skill.id) {
          // Fallback: single skill (old format)
          const skill: Skill = {
            id: data.skill.id,
            name: data.skill.name,
            description: data.skill.description,
            triggers: data.skill.triggers,
            strategies: data.skill.strategies,
            source: "generated",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          if (graphRef.current) {
            await graphRef.current.addSkillNode(skill);
          }
        }
      } catch (e) {
        console.error("Failed to generate skill:", e);
        alert(`Failed to generate skill: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setGenerating(false);
        setGenerateInput("");
      }
    },
    []
  );

  const handleGenerateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (generateInput.trim()) {
        handleGenerate(generateInput);
      }
    },
    [generateInput, handleGenerate]
  );

  return (
    <main className="relative h-screen w-full bg-black overflow-hidden">
      <SkillGraph3DContainer 
        onSkillClick={(skillId) => {
          console.log("Skill clicked:", skillId);
        }}
        onGenerateComplete={(skill) => {
          console.log("Skill added to graph:", skill.name);
        }}
        ref={graphRef}
      />

      {/* Generate Skill Panel */}
      <div 
        style={{ 
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9999,
          pointerEvents: 'auto'
        }}
      >
        <div 
          className="w-[380px] bg-[#0a0a0a] border border-[#1a1a1a] text-[#f5f5f5]"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          <div className="p-5 border-b border-[#1a1a1a]">
            <h3 className="text-sm font-medium uppercase tracking-wider text-[#f5f5f5]">
              Generate Skill
            </h3>
            <p className="text-xs text-[#a0a0a0] mt-1.5">
              Create a new skill pack for Clawdbot
            </p>
          </div>
          <form onSubmit={handleGenerateSubmit} className="p-5 space-y-4">
            <div>
              <input
                type="text"
                value={generateInput}
                onChange={(e) => setGenerateInput(e.target.value)}
                placeholder="e.g., crypto trading, web development"
                className="w-full px-4 py-3 bg-[#000000] border border-[#1a1a1a] text-[#f5f5f5] text-sm placeholder-[#666666] focus:outline-none focus:border-[#2a2a2a] transition-colors duration-150"
                disabled={generating}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!generateInput.trim() || generating}
                className="flex-1 px-4 py-3 bg-[#ffffff] hover:bg-[#e5e5e5] disabled:bg-[#1a1a1a] disabled:text-[#666666] disabled:cursor-not-allowed text-[#000000] text-sm font-medium uppercase tracking-wider transition-all duration-150 disabled:hover:bg-[#1a1a1a]"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
              <Link
                href="/search"
                className="px-4 py-3 bg-[#141414] hover:bg-[#1f1f1f] text-[#f5f5f5] text-sm font-medium uppercase tracking-wider transition-colors duration-150 border border-[#1a1a1a]"
              >
                Browse
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
