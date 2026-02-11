"use client";

import { SearchBar, Card, LoadingPulse, Button } from "@skilledclaws/ui";
import { SkillCard } from "./SkillCard";
import type { SearchResult } from "@/lib/api";

export interface SearchOverlayProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit?: (value?: string) => void;
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
  onGenerate?: (skillName: string) => void;
}

export function SearchOverlay({
  query,
  onQueryChange,
  onSearchSubmit,
  result,
  loading,
  error,
  onGenerate,
}: SearchOverlayProps) {
  return (
    <div className="absolute left-0 right-0 top-6 z-10 flex flex-col items-center gap-4 px-4">
      <SearchBar
        value={query}
        onChange={onQueryChange}
        onSearch={onSearchSubmit}
        className="max-w-xl"
      />
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <Card className="w-full max-w-xl">
          <LoadingPulse lines={3} />
        </Card>
      )}
      {result && !loading && result.trends.length > 0 && (
        <Card className="w-full max-w-xl space-y-2">
          <p className="text-muted text-sm">Trends</p>
          <div className="flex flex-wrap gap-2">
            {result.trends.map((t) => (
              <SkillCard
                key={t.name}
                name={t.name}
                description={t.description}
                onGenerate={() => onGenerate?.(t.name)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
