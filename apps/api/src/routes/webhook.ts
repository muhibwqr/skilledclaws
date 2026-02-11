import type { Hono } from "hono";
import Stripe from "stripe";
import { skillSynthesisAgent } from "../mastra/agents/skill-synthesis.js";
import { SkillBuilder, skillBuildInputSchema } from "@skilledclaws/skills-engine";
import { uploadSkillZip, getPresignedDownloadUrl, skillKey, isSupabaseConfigured, storeSkill, findSimilarSkills } from "../services/supabase.js";
import { generateAndStoreSkillEmbedding } from "../services/embeddings.js";
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
      if (!isSupabaseConfigured()) {
        console.error("Webhook: Supabase not configured, skipping skill build");
        return c.json({ received: true });
      }
      try {
        // Load few-shot examples
        const { loadFewShotExamples, getFewShotExamplesPrompt } = await import("../examples/load-examples.js");
        const examples = loadFewShotExamples();
        const examplesPrompt = getFewShotExamplesPrompt(examples);
        
        const prompt = examplesPrompt
          ? `${examplesPrompt}\n\nNow generate a complete .skills pack for the skill or trade: "${skillName}". Include description, trigger phrases, strategies (title + content), and optional prompt templates.`
          : `Generate a complete .skills pack for the skill or trade: "${skillName}". Include description, trigger phrases, strategies (title + content), and optional prompt templates.`;
        
        const result = await skillSynthesisAgent.generate(prompt, {
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
        });
        const input = result?.object ?? parseSkillInputFromText(result?.text, skillName);
        const validated = skillBuildInputSchema.safeParse(input);
        if (!validated.success) {
          console.error("Webhook: invalid skill input", validated.error.flatten());
          return c.json({ received: true });
        }
        // Post-training evaluation
        try {
          const { evaluateSkillGeneration } = await import("../eval/post-training.js");
          const evalResult = await evaluateSkillGeneration(validated.data.skillName, validated.data);
          console.log(`[POST-TRAINING] Skill: ${validated.data.skillName}`, {
            quality: evalResult.quality.toFixed(2),
            issues: evalResult.issues.length,
            suggestions: evalResult.suggestions.length,
          });
          if (evalResult.quality < 0.7) {
            console.warn(`[POST-TRAINING] Low quality (${evalResult.quality.toFixed(2)}):`, evalResult.issues);
          }
        } catch (evalErr) {
          console.error("Post-training eval error:", evalErr);
        }

        // Store skill in Supabase
        const storedSkill = await storeSkill({
          name: validated.data.skillName,
          description: validated.data.description,
          triggers: validated.data.triggers,
          strategies: validated.data.strategies,
          prompt_templates: validated.data.promptTemplates,
          source: "generated",
        });

        // Generate and store embedding
        await generateAndStoreSkillEmbedding(
          storedSkill.id,
          validated.data.skillName,
          validated.data.description,
          validated.data.strategies
        );

        // Find similar skills (both repo and generated) for recommendations
        const embedding = await import("../services/embeddings.js").then((m) =>
          m.generateSkillEmbedding(validated.data.skillName, validated.data.description, validated.data.strategies)
        );
        const similar = await findSimilarSkills(embedding, 5); // Top 5 recommendations

        // Build and upload ZIP
        const zipBuffer = await builder.buildZipBuffer(validated.data);
        const key = skillKey(sessionId, validated.data.skillName);
        await uploadSkillZip(key, zipBuffer);
        const url = await getPresignedDownloadUrl(key);
        await setDownloadUrl(sessionId, url);

        console.log(`[WEBHOOK] Skill generated and stored: ${storedSkill.id}`);
        console.log(`[WEBHOOK] Recommendations: ${similar.length} similar skills found`);
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
