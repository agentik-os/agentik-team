import { Router, type Request, type Response } from "express";
import { billingService } from "../services/billing.js";

export function billingRoutes() {
  const router = Router();
  const billing = billingService();

  // POST /api/billing/checkout — create a checkout session
  router.post("/billing/checkout", async (req: Request, res: Response) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { priceId, successUrl, cancelUrl } = req.body as {
      priceId?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    if (!priceId || !successUrl || !cancelUrl) {
      res.status(400).json({ error: "priceId, successUrl, and cancelUrl are required" });
      return;
    }

    const userId = req.actor.userId;
    let record = billing.getRecord(userId);

    if (!record?.stripeCustomerId) {
      const customer = await billing.createCustomer(userId, "");
      record = billing.getRecord(userId);
      if (!record) {
        res.status(500).json({ error: "Failed to create billing record" });
        return;
      }
    }

    const session = await billing.createCheckoutSession(
      record.stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl,
    );

    res.json({ url: session.url });
  });

  // POST /api/billing/portal — create a customer portal session
  router.post("/billing/portal", async (req: Request, res: Response) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { returnUrl } = req.body as { returnUrl?: string };
    if (!returnUrl) {
      res.status(400).json({ error: "returnUrl is required" });
      return;
    }

    const userId = req.actor.userId;
    const record = billing.getRecord(userId);

    if (!record?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found. Please subscribe first." });
      return;
    }

    const session = await billing.createPortalSession(record.stripeCustomerId, returnUrl);
    res.json({ url: session.url });
  });

  // GET /api/billing/subscription — get current user's subscription
  router.get("/billing/subscription", async (req: Request, res: Response) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.actor.userId;
    const plan = billing.getUserPlan(userId);
    const record = billing.getRecord(userId);

    res.json({
      tier: plan.tier,
      limits: plan.limits,
      subscriptionStatus: record?.subscriptionStatus ?? "none",
      currentPeriodEnd: record?.currentPeriodEnd ?? null,
    });
  });

  return router;
}

/**
 * Webhook route — must be mounted BEFORE express.json() or with raw body.
 * Since app.ts already stores rawBody, we use that.
 */
export function billingWebhookRoute() {
  const router = Router();
  const billing = billingService();

  router.post("/billing/webhook", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: "Missing raw body" });
      return;
    }

    try {
      await billing.handleWebhook(rawBody, signature as string);
      res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook handling failed";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
