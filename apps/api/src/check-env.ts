#!/usr/bin/env tsx
/**
 * Check if all required environment variables are configured
 */

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load environment variables
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

interface EnvCheck {
  name: string;
  required: boolean;
  present: boolean;
  masked: string;
}

const requiredEnvVars: EnvCheck[] = [
  { name: "OPENAI_API_KEY", required: true, present: !!process.env.OPENAI_API_KEY, masked: maskValue(process.env.OPENAI_API_KEY) },
  { name: "SUPABASE_URL", required: true, present: !!process.env.SUPABASE_URL, masked: maskValue(process.env.SUPABASE_URL) },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true, present: !!process.env.SUPABASE_SERVICE_ROLE_KEY, masked: maskValue(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  { name: "SUPABASE_STORAGE_BUCKET", required: false, present: !!process.env.SUPABASE_STORAGE_BUCKET, masked: maskValue(process.env.SUPABASE_STORAGE_BUCKET) },
  { name: "STRIPE_SECRET_KEY", required: false, present: !!process.env.STRIPE_SECRET_KEY, masked: maskValue(process.env.STRIPE_SECRET_KEY) },
  { name: "STRIPE_WEBHOOK_SECRET", required: false, present: !!process.env.STRIPE_WEBHOOK_SECRET, masked: maskValue(process.env.STRIPE_WEBHOOK_SECRET) },
];

const webEnvVars: EnvCheck[] = [
  { name: "NEXT_PUBLIC_API_URL", required: true, present: !!process.env.NEXT_PUBLIC_API_URL, masked: maskValue(process.env.NEXT_PUBLIC_API_URL) },
  { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", required: false, present: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, masked: maskValue(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) },
];

function maskValue(value: string | undefined): string {
  if (!value) return "❌ Not set";
  if (value.length <= 8) return "***";
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

console.log("🔍 Environment Variable Check\n");
console.log("=".repeat(60));
console.log("\n📦 API Environment Variables:\n");

let allApiRequired = true;
requiredEnvVars.forEach((env) => {
  const status = env.present ? "✅" : env.required ? "❌" : "⚠️ ";
  const req = env.required ? "(required)" : "(optional)";
  console.log(`${status} ${env.name.padEnd(30)} ${req.padEnd(12)} ${env.masked}`);
  if (env.required && !env.present) {
    allApiRequired = false;
  }
});

console.log("\n🌐 Web Environment Variables:\n");

let allWebRequired = true;
webEnvVars.forEach((env) => {
  const status = env.present ? "✅" : env.required ? "❌" : "⚠️ ";
  const req = env.required ? "(required)" : "(optional)";
  console.log(`${status} ${env.name.padEnd(35)} ${req.padEnd(12)} ${env.masked}`);
  if (env.required && !env.present) {
    allWebRequired = false;
  }
});

console.log("\n" + "=".repeat(60));

// Summary
const allRequired = allApiRequired && allWebRequired;

if (allRequired) {
  console.log("\n✅ All required environment variables are configured!");
  console.log("\n📋 Summary:");
  console.log("   ✅ OpenAI API Key: Configured");
  console.log("   ✅ Supabase: Configured");
  console.log("   ✅ API URL: Configured");
  
  if (process.env.STRIPE_SECRET_KEY) {
    console.log("   ✅ Stripe: Configured (payments enabled)");
  } else {
    console.log("   ⚠️  Stripe: Not configured (payments disabled)");
  }
  
  console.log("\n🚀 Ready to run!");
} else {
  console.log("\n❌ Missing required environment variables!");
  console.log("\n📝 Next steps:");
  
  if (!process.env.OPENAI_API_KEY) {
    console.log("   1. Get OPENAI_API_KEY from https://platform.openai.com/api-keys");
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("   2. Get Supabase credentials from https://supabase.com/dashboard");
  }
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.log("   3. Set NEXT_PUBLIC_API_URL=http://localhost:3001 in apps/web/.env.local");
  }
  
  console.log("\n   Edit apps/api/.env.local and apps/web/.env.local with your keys");
}

console.log("\n");

process.exit(allRequired ? 0 : 1);
