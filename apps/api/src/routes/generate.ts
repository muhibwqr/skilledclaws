import type { Hono } from "hono";
import { generateBodySchema } from "../middleware/sanitize.js";
import { createCheckoutSession, isStripeConfigured } from "../services/stripe.js";

const FALLBACK_ORIGIN = "http://localhost:3000";

export function registerGenerate(app: Hono) {
  app.post("/api/generate/checkout", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = generateBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    if (!isStripeConfigured()) {
      return c.json({ error: "Checkout not configured" }, 503);
    }
    const origin = parsed.data.successUrl
      ? new URL(parsed.data.successUrl).origin
      : c.req.header("origin") ?? FALLBACK_ORIGIN;
    const successUrl = parsed.data.successUrl ?? `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = parsed.data.cancelUrl ?? origin;
    const session = await createCheckoutSession({
      skillName: parsed.data.skillName,
      successUrl,
      cancelUrl,
    });
    if (!session?.url) {
      return c.json({ error: "Failed to create checkout session" }, 500);
    }
    return c.json({ url: session.url });
  });

  app.get("/api/generate/download", async (c) => {
    const sessionId = c.req.query("session_id");
    if (!sessionId) {
      return c.json({ error: "session_id required" }, 400);
    }
    const { getDownloadUrlBySession } = await import("../services/download-store.js");
    const url = await getDownloadUrlBySession(sessionId);
    if (!url) {
      return c.json({ error: "Download not ready" }, 404);
    }
    return c.json({ url });
  });
}
