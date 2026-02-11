import type { Context } from "hono";

export function registerWebhook(app: import("hono").Hono) {
  app.post("/api/webhooks/stripe", async (c) => {
    const raw = await c.req.text();
    const sig = c.req.header("stripe-signature") ?? "";
    try {
      const { constructWebhookEvent } = await import("../services/stripe.js");
      constructWebhookEvent(raw, sig);
    } catch {
      return c.json({ error: "Webhook signature verification failed" }, 400);
    }
    return c.json({ received: true });
  });
}
