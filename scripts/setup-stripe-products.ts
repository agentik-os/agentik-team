/**
 * Creates CAIO Stripe products and prices.
 * Run: npx tsx scripts/setup-stripe-products.ts
 *
 * Requires STRIPE_SECRET_KEY in .env.local or environment.
 */
import Stripe from "stripe";
import { config } from "dotenv";
import path from "node:path";

// Try both root and current dir for .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), "../.env.local") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

async function main() {
  console.log("Creating CAIO Stripe products and prices...\n");

  // Pro plan
  const proProduct = await stripe.products.create({
    name: "CAIO Pro",
    description: "10 agents, unlimited runs, priority support",
    metadata: { tier: "pro" },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2900, // $29.00
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "pro" },
  });

  console.log(`CAIO Pro:`);
  console.log(`  Product ID: ${proProduct.id}`);
  console.log(`  Price ID:   ${proPrice.id}`);
  console.log(`  Amount:     $29/month\n`);

  // Enterprise plan
  const enterpriseProduct = await stripe.products.create({
    name: "CAIO Enterprise",
    description: "Unlimited agents, unlimited runs, dedicated support, SSO",
    metadata: { tier: "enterprise" },
  });

  const enterprisePrice = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 9900, // $99.00
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "enterprise" },
  });

  console.log(`CAIO Enterprise:`);
  console.log(`  Product ID: ${enterpriseProduct.id}`);
  console.log(`  Price ID:   ${enterprisePrice.id}`);
  console.log(`  Amount:     $99/month\n`);

  console.log("---");
  console.log("Add these to your .env.local:");
  console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
  console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}`);
  console.log(`VITE_STRIPE_PRO_PRICE_ID=${proPrice.id}`);
  console.log(`VITE_STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}`);
}

main().catch((err) => {
  console.error("Failed to create Stripe products:", err);
  process.exit(1);
});
