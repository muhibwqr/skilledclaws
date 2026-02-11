const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface SearchResult {
  trends: Array<{ name: string; description?: string; count?: number }>;
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties?: Record<string, unknown>;
    }>;
  };
}

export async function searchSkills(query: string): Promise<SearchResult> {
  const res = await fetch(
    `${API_URL}/api/search?q=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Search failed");
  }
  return res.json();
}

export async function createCheckoutSession(skillName: string): Promise<{ url: string }> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${API_URL}/api/generate/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skillName,
      successUrl: origin ? `${origin}/success?session_id={CHECKOUT_SESSION_ID}` : undefined,
      cancelUrl: origin || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Checkout failed");
  }
  const data = await res.json();
  if (!data.url) throw new Error("No checkout URL returned");
  return { url: data.url };
}

export async function getDownloadUrl(sessionId: string): Promise<{ url: string } | null> {
  const res = await fetch(
    `${API_URL}/api/generate/download?session_id=${encodeURIComponent(sessionId)}`
  );
  if (!res.ok || res.status === 404) return null;
  const data = await res.json();
  return data.url ? { url: data.url } : null;
}
