const store = new Map<string, string>();

export async function setDownloadUrl(sessionId: string, url: string): Promise<void> {
  store.set(sessionId, url);
}

export async function getDownloadUrlBySession(sessionId: string): Promise<string | null> {
  return store.get(sessionId) ?? null;
}
