import Stripe from "stripe";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../middleware/logger.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

const BILLING_DATA_PATH = path.resolve(
  process.env.AGENTIK_DATA_DIR ?? path.join(process.cwd(), ".agentik-team"),
  "billing.json",
);

export type PlanTier = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "none";

export interface BillingRecord {
  userId: string;
  stripeCustomerId: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  planTier: PlanTier;
  currentPeriodEnd?: string;
}

interface BillingData {
  records: Record<string, BillingRecord>;
}

const PLAN_LIMITS = {
  free: { maxAgents: 3, maxRunsPerDay: 10 },
  pro: { maxAgents: 10, maxRunsPerDay: Infinity },
  enterprise: { maxAgents: Infinity, maxRunsPerDay: Infinity },
} as const;

function loadBillingData(): BillingData {
  try {
    if (fs.existsSync(BILLING_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(BILLING_DATA_PATH, "utf-8"));
    }
  } catch (err) {
    logger.warn({ err }, "Failed to load billing data, starting fresh");
  }
  return { records: {} };
}

function saveBillingData(data: BillingData): void {
  const dir = path.dirname(BILLING_DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BILLING_DATA_PATH, JSON.stringify(data, null, 2));
}

export function billingService() {
  function getRecord(userId: string): BillingRecord | null {
    const data = loadBillingData();
    return data.records[userId] ?? null;
  }

  function upsertRecord(record: BillingRecord): void {
    const data = loadBillingData();
    data.records[record.userId] = record;
    saveBillingData(data);
  }

  function getUserPlan(userId: string): { tier: PlanTier; limits: { maxAgents: number; maxRunsPerDay: number } } {
    const record = getRecord(userId);
    if (!record || record.subscriptionStatus !== "active") {
      return { tier: "free", limits: PLAN_LIMITS.free };
    }
    return { tier: record.planTier, limits: PLAN_LIMITS[record.planTier] };
  }

  async function createCustomer(userId: string, email: string): Promise<Stripe.Customer> {
    const existing = getRecord(userId);
    if (existing?.stripeCustomerId) {
      const customer = await stripe.customers.retrieve(existing.stripeCustomerId);
      if (!customer.deleted) return customer as Stripe.Customer;
    }

    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    upsertRecord({
      userId,
      stripeCustomerId: customer.id,
      subscriptionStatus: "none",
      planTier: "free",
    });

    return customer;
  }

  async function createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });
  }

  async function createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async function getSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });
    return subscriptions.data[0] ?? null;
  }

  function resolveplanTier(priceId: string): PlanTier {
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID ?? "price_pro_monthly";
    const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "price_enterprise_monthly";
    if (priceId === proPriceId) return "pro";
    if (priceId === enterprisePriceId) return "enterprise";
    return "free";
  }

  async function handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = sub.items.data[0]?.price?.id ?? "";
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;

          // Find userId from billing records by customerId
          const data = loadBillingData();
          const record = Object.values(data.records).find((r) => r.stripeCustomerId === customerId);
          if (record) {
            upsertRecord({
              ...record,
              subscriptionId: sub.id,
              subscriptionStatus: sub.status as SubscriptionStatus,
              planTier: resolveplanTier(priceId),
              currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
            });
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price?.id ?? "";

        const data = loadBillingData();
        const record = Object.values(data.records).find((r) => r.stripeCustomerId === customerId);
        if (record) {
          const status = sub.status as SubscriptionStatus;
          upsertRecord({
            ...record,
            subscriptionId: sub.id,
            subscriptionStatus: status === "canceled" || event.type === "customer.subscription.deleted" ? "canceled" : status,
            planTier: status === "canceled" || event.type === "customer.subscription.deleted" ? "free" : resolveplanTier(priceId),
            currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";

        const data = loadBillingData();
        const record = Object.values(data.records).find((r) => r.stripeCustomerId === customerId);
        if (record) {
          upsertRecord({
            ...record,
            subscriptionStatus: "past_due",
          });
        }
        break;
      }

      default:
        logger.debug({ eventType: event.type }, "Unhandled Stripe webhook event");
    }
  }

  return {
    getRecord,
    upsertRecord,
    getUserPlan,
    createCustomer,
    createCheckoutSession,
    createPortalSession,
    getSubscription,
    handleWebhook,
    PLAN_LIMITS,
  };
}
