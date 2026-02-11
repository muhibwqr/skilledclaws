"use client";

import { useSearch } from "@/hooks/useSearch";
import { Map } from "@/components/Map";
import { SearchOverlay } from "@/components/SearchOverlay";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createCheckoutSession } from "@/lib/api";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export default function HomePage() {
  const router = useRouter();
  const { query, setQuery, result, loading, error, onSearchSubmit } = useSearch();

  const handleGenerate = useCallback(
    async (skillName: string) => {
      try {
        const { url } = await createCheckoutSession(skillName);
        if (url) router.push(url);
      } catch (e) {
        console.error(e);
      }
    },
    [router]
  );

  return (
    <main className="relative h-screen w-full bg-background">
      {MAPBOX_TOKEN ? (
        <Map
          accessToken={MAPBOX_TOKEN}
          geojson={result?.geojson ?? null}
          className="absolute inset-0"
        />
      ) : (
        <div className="flex absolute inset-0 items-center justify-center text-muted">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to show the map.
        </div>
      )}
      <SearchOverlay
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={onSearchSubmit}
        result={result}
        loading={loading}
        error={error}
        onGenerate={handleGenerate}
      />
    </main>
  );
}
