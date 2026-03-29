import { Router } from "express";
import type { Db } from "@agentik-os/db";
import { companies, companyMemberships } from "@agentik-os/db";
import { eq, and } from "drizzle-orm";
import { clerk } from "../auth/clerk.js";
import { logger } from "../middleware/logger.js";

/**
 * Clerk webhook handler for organization events.
 * Syncs Clerk org changes back to local database.
 */
export function clerkWebhookRoutes(db: Db) {
  const router = Router();

  router.post("/webhooks/clerk", async (req, res) => {
    if (!clerk) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const { type, data } = req.body ?? {};

    try {
      switch (type) {
        case "organization.created": {
          // If an org was created externally in Clerk, we could optionally create a company.
          // For now, we only log it since our flow creates orgs from company creation.
          logger.info({ clerkOrgId: data?.id, name: data?.name }, "Clerk organization.created webhook received");
          break;
        }

        case "organization.deleted": {
          // If a Clerk org is deleted externally, clear the reference on the company
          if (data?.id) {
            await db
              .update(companies)
              .set({ clerkOrgId: null, updatedAt: new Date() })
              .where(eq(companies.clerkOrgId, data.id));
            logger.info({ clerkOrgId: data.id }, "Cleared clerkOrgId from company after Clerk org deletion");
          }
          break;
        }

        case "organizationMembership.created": {
          const orgId = data?.organization?.id;
          const userId = data?.public_user_data?.user_id;
          if (orgId && userId) {
            // Find the local company matching this Clerk org
            const company = await db
              .select({ id: companies.id })
              .from(companies)
              .where(eq(companies.clerkOrgId, orgId))
              .then((rows) => rows[0] ?? null);
            if (company) {
              // Ensure local membership exists
              const existing = await db
                .select({ id: companyMemberships.id })
                .from(companyMemberships)
                .where(
                  and(
                    eq(companyMemberships.companyId, company.id),
                    eq(companyMemberships.principalType, "user"),
                    eq(companyMemberships.principalId, userId),
                  ),
                )
                .then((rows) => rows[0] ?? null);
              if (!existing) {
                await db.insert(companyMemberships).values({
                  companyId: company.id,
                  principalType: "user",
                  principalId: userId,
                  membershipRole: "member",
                  status: "active",
                });
                logger.info({ companyId: company.id, userId }, "Created local membership from Clerk org membership");
              }
            }
          }
          break;
        }

        case "organizationMembership.deleted": {
          const orgId = data?.organization?.id;
          const userId = data?.public_user_data?.user_id;
          if (orgId && userId) {
            const company = await db
              .select({ id: companies.id })
              .from(companies)
              .where(eq(companies.clerkOrgId, orgId))
              .then((rows) => rows[0] ?? null);
            if (company) {
              await db
                .delete(companyMemberships)
                .where(
                  and(
                    eq(companyMemberships.companyId, company.id),
                    eq(companyMemberships.principalType, "user"),
                    eq(companyMemberships.principalId, userId),
                  ),
                );
              logger.info({ companyId: company.id, userId }, "Removed local membership from Clerk org membership deletion");
            }
          }
          break;
        }

        default:
          logger.debug({ type }, "Unhandled Clerk webhook event type");
      }
    } catch (err) {
      logger.error({ err, type }, "Error processing Clerk webhook");
      res.status(500).json({ error: "Webhook processing failed" });
      return;
    }

    res.status(200).json({ ok: true });
  });

  return router;
}
