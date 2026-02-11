"use client";

import { useState, useCallback, useRef } from "react";
import { searchSkills, type SearchResult } from "@/lib/api";

const DEBOUNCE_MS = 300;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchSkills(trimmed);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const trimmed = value.trim();
      if (!trimmed) {
        setResult(null);
        setError(null);
        return;
      }
      timeoutRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    },
    [runSearch]
  );

  const onSearchSubmit = useCallback(
    (value?: string) => {
      const q = (value ?? query).trim();
      if (q) runSearch(q);
    },
    [query, runSearch]
  );

  return { query, setQuery: onQueryChange, result, loading, error, onSearchSubmit };
}
