import type { Hono } from "hono";
import Stripe from "stripe";
import { skillSynthesisAgent } from "../mastra/agents/skill-synthesis.js";
import { SkillBuilder, skillBuildInputSchema } from "@skilledclaws/skills-engine";
import { uploadSkillZip, getPresignedDownloadUrl, skillKey, isR2Configured } from "../services/r2.js";
import { setDownloadUrl } from "../services/download-store.js";

const builder = new SkillBuilder("1.0.0");

export function registerWebhook(app: Hono) {
  app.post("/api/webhooks/stripe", async (c) => {
    const raw = await c.req.text();
    const sig = c.req.header("stripe-signature") ?? "";
    let event: Stripe.Event;
    try {
      const { constructWebhookEvent } = await import("../services/stripe.js");
      event = constructWebhookEvent(raw, sig);
    } catch (err) {
      console.error("Stripe webhook signature error:", err);
      return c.json({ error: "Webhook signature verification failed" }, 400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const skillName = session.metadata?.skillName as string | undefined;
      if (!skillName?.trim()) {
        console.error("Webhook: missing skillName in metadata");
        return c.json({ received: true });
      }
      if (!isR2Configured()) {
        console.error("Webhook: R2 not configured, skipping skill build");
        return c.json({ received: true });
      }
      try {
        const result = await skillSynthesisAgent.generate(
          `Generate a complete .skills pack for the skill or trade: "${skillName}". Include description, trigger phrases, strategies (title + content), and optional prompt templates.`,
          {
            structuredOutput: {
              schema: skillBuildInputSchema,
              errorStrategy: "fallback",
              fallbackValue: {
                skillName: skillName.trim(),
                description: `Veteran-level skill pack for ${skillName}.`,
                triggers: [`help with ${skillName}`, skillName],
                strategies: [{ title: "Overview", content: "Add your strategies here." }],
              },
            },
            modelSettings: { maxOutputTokens: 4096 },
          }
        );
        const input = result?.object ?? parseSkillInputFromText(result?.text, skillName);
        const validated = skillBuildInputSchema.safeParse(input);
        if (!validated.success) {
          console.error("Webhook: invalid skill input", validated.error.flatten());
          return c.json({ received: true });
        }
        const zipBuffer = await builder.buildZipBuffer(validated.data);
        const key = skillKey(sessionId, validated.data.skillName);
        await uploadSkillZip(key, zipBuffer);
        const url = await getPresignedDownloadUrl(key);
        await setDownloadUrl(sessionId, url);
      } catch (err) {
        console.error("Webhook: skill build failed", err);
      }
    }
    return c.json({ received: true });
  });
}

function parseSkillInputFromText(
  text: string | undefined,
  skillName: string
): Record<string, unknown> {
  if (!text?.trim()) {
    return {
      skillName,
      description: `Skill pack for ${skillName}.`,
      triggers: [skillName],
      strategies: [],
    };
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { skillName, description: "", triggers: [], strategies: [] };
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return { skillName, description: "", triggers: [], strategies: [] };
  }
}
