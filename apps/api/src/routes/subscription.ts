import type { Hono } from "hono";
import { stripe, isStripeConfigured } from "../services/stripe.js";

export function registerSubscription(app: Hono) {
  // Check if a checkout session was completed (user has paid)
  app.get("/api/subscription/check", async (c) => {
    const sessionId = c.req.query("session_id");
    if (!sessionId) {
      return c.json({ error: "session_id required" }, 400);
    }

    if (!isStripeConfigured()) {
      return c.json({ error: "Stripe not configured" }, 503);
    }

    try {
      const session = await stripe!.checkout.sessions.retrieve(sessionId);
      
      return c.json({
        paid: session.payment_status === "paid",
        status: session.payment_status,
        skillName: session.metadata?.skillName,
      });
    } catch (err) {
      console.error("Subscription check error:", err);
      return c.json({ error: "Failed to check subscription" }, 500);
    }
  });

  // Check if user has access to a skill (by email or session)
  app.get("/api/subscription/access", async (c) => {
    const email = c.req.query("email");
    const skillName = c.req.query("skill_name");
    
    if (!email || !skillName) {
      return c.json({ error: "email and skill_name required" }, 400);
    }

    if (!isStripeConfigured()) {
      return c.json({ error: "Stripe not configured" }, 503);
    }

    try {
      // Search for checkout sessions with this email and skill
      const sessions = await stripe!.checkout.sessions.list({
        limit: 100,
        customer_details: { email },
      });

      const hasAccess = sessions.data.some(
        (s) =>
          s.payment_status === "paid" &&
          s.metadata?.skillName?.toLowerCase() === skillName.toLowerCase()
      );

      return c.json({ hasAccess });
    } catch (err) {
      console.error("Access check error:", err);
      return c.json({ error: "Failed to check access" }, 500);
    }
  });
}
