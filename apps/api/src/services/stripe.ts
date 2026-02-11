import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const stripe = secretKey ? new Stripe(secretKey) : null;

export function isStripeConfigured(): boolean {
  return Boolean(stripe);
}

export function getWebhookSecret(): string | undefined {
  return webhookSecret;
}

export async function createCheckoutSession(params: {
  skillName: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) return null;
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `.skills file: ${params.skillName}`,
            description: "Veteran-level skill pack for Clawdbot",
            images: undefined,
          },
          unit_amount: 300, // $3.00
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    metadata: {
      skillName: params.skillName,
    },
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripe || !webhookSecret) {
    throw new Error("Stripe or webhook secret not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
