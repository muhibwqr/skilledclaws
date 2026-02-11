"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDownloadUrl } from "@/lib/api";
import { Button, Card, LoadingPulse } from "@skilledclaws/ui";
import Link from "next/link";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Missing session_id");
      return;
    }

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      try {
        const data = await getDownloadUrl(sessionId);
        if (data?.url) {
          setDownloadUrl(data.url);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
      if (pollCount >= MAX_POLLS) {
        setLoading(false);
        setError("Download not ready yet. Check your email or try again later.");
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <p className="text-muted">Missing session. Return to the map to generate a skill.</p>
          <Link href="/">
            <Button variant="primary" className="mt-4">
              Back to map
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-medium text-text">Payment successful</h1>
        {loading && (
          <>
            <LoadingPulse lines={2} />
            <p className="text-muted text-sm">Preparing your .skills file…</p>
          </>
        )}
        {error && (
          <p className="text-muted text-sm" role="alert">
            {error}
          </p>
        )}
        {downloadUrl && (
          <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
            <Button variant="primary">Download .skills file</Button>
          </a>
        )}
        <Link href="/">
          <Button variant="ghost">Back to map</Button>
        </Link>
      </Card>
    </div>
  );
}
