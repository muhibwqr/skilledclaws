"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAllSkills, searchSkills, type Skill } from "@/lib/api";
import Link from "next/link";

export default function SearchPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "generated" | "awesome-claude-skills">("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllSkills(pageSize, page * pageSize, sourceFilter === "all" ? undefined : sourceFilter);
      setSkills(response.skills as Skill[]);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadSkills();
      return;
    }

    try {
      setLoading(true);
      const results = await searchSkills(searchQuery, pageSize, sourceFilter === "all" ? undefined : sourceFilter);
      setSkills(results.results.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        triggers: [],
        strategies: [],
        source: r.source,
        created_at: "",
        updated_at: "",
      })) as Skill[]);
      setTotal(results.results.length);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sourceFilter, loadSkills]);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      loadSkills();
    }
  }, [page, sourceFilter]);

  return (
    <main className="min-h-screen bg-black text-[#f5f5f5]">
      <div className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">Skill Library</h1>
              <p className="text-sm text-[#666666] mt-1 uppercase tracking-wider">
                Browse all pre-built skills
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium uppercase tracking-wider text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414] transition-colors duration-150"
            >
              Back to Graph
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(0);
                    handleSearch();
                  }
                }}
                placeholder="Search skills..."
                className="w-full bg-[#000000] border border-[#1a1a1a] px-4 py-3 text-[#f5f5f5] placeholder-[#666666] text-sm outline-none transition-all duration-150 focus:border-[#2a2a2a] hover:border-[#1f1f1f]"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSourceFilter("all");
                  setPage(0);
                }}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  sourceFilter === "all"
                    ? "text-[#f5f5f5] bg-[#141414]"
                    : "text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setSourceFilter("generated");
                  setPage(0);
                }}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  sourceFilter === "generated"
                    ? "text-[#f5f5f5] bg-[#141414]"
                    : "text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414]"
                }`}
              >
                Generated
              </button>
              <button
                onClick={() => {
                  setSourceFilter("awesome-claude-skills");
                  setPage(0);
                }}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  sourceFilter === "awesome-claude-skills"
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-sm text-[#a0a0a0]">Loading skills...</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[#a0a0a0]">No skills found</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-[#666666] uppercase tracking-wider">
              {total} {total === 1 ? "skill" : "skills"} found
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 hover:border-[#2a2a2a] hover:bg-[#141414] transition-colors duration-150"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-medium text-[#f5f5f5]">{skill.name}</h3>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 bg-[#141414] text-[#888888] border border-[#1a1a1a]">
                      {skill.source === "generated" ? "New" : "Repo"}
                    </span>
                  </div>
                  <p className="text-sm text-[#a0a0a0] line-clamp-3 mb-4">{skill.description}</p>
                  {skill.triggers.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-[#666666] mb-2">
                        Triggers
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skill.triggers.slice(0, 3).map((trigger, idx) => (
                          <span
                            key={idx}
                            className="text-xs text-[#888888] bg-[#000000] border border-[#1a1a1a] px-2 py-1"
                          >
                            {trigger}
                          </span>
                        ))}
                        {skill.triggers.length > 3 && (
                          <span className="text-xs text-[#666666]">+{skill.triggers.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => router.push(`/?addSkill=${skill.id}`)}
                    className="w-full px-4 py-2 text-sm font-medium uppercase tracking-wider bg-[#ffffff] hover:bg-[#e5e5e5] text-[#000000] transition-colors duration-150"
                  >
                    Add to Graph
                  </button>
                </div>
              ))}
            </div>

            {total > pageSize && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 text-sm font-medium uppercase tracking-wider text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Previous
                </button>
                <span className="text-sm text-[#666666]">
                  Page {page + 1} of {Math.ceil(total / pageSize)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= total}
                  className="px-4 py-2 text-sm font-medium uppercase tracking-wider text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#141414] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
