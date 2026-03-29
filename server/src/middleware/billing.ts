import type { RequestHandler } from "express";
import { billingService, type PlanTier } from "../services/billing.js";

const TIER_LEVELS: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

/**
 * Middleware that checks if the current user's subscription meets the minimum plan tier.
 * If no subscription exists, the user is treated as "free".
 */
export function requirePlan(minimumTier: PlanTier): RequestHandler {
  const billing = billingService();
  const requiredLevel = TIER_LEVELS[minimumTier];

  return (req, res, next) => {
    // Agents bypass billing checks
    if (req.actor.type === "agent") {
      next();
      return;
    }

    // Local trusted mode bypasses billing
    if (req.actor.source === "local_implicit") {
      next();
      return;
    }

    if (req.actor.type !== "board" || !req.actor.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { tier } = billing.getUserPlan(req.actor.userId);
    const userLevel = TIER_LEVELS[tier];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: "Upgrade required",
        requiredPlan: minimumTier,
        currentPlan: tier,
        message: `This feature requires a ${minimumTier} plan or higher. Please upgrade.`,
      });
      return;
    }

    next();
  };
}
