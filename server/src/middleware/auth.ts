import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@agentik-os/db";
import { agentApiKeys, agents, authUsers, companies, companyMemberships, instanceUserRoles } from "@agentik-os/db";
import { verifyLocalAgentJwt } from "../agent-auth-jwt.js";
import type { DeploymentMode } from "@agentik-os/shared";
import type { BetterAuthSessionResult } from "../auth/better-auth.js";
import { clerk, verifyClerkSession } from "../auth/clerk.js";
import { logger } from "./logger.js";
import { boardAuthService } from "../services/board-auth.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

interface ActorMiddlewareOptions {
  deploymentMode: DeploymentMode;
  resolveSession?: (req: Request) => Promise<BetterAuthSessionResult | null>;
}

export function actorMiddleware(db: Db, opts: ActorMiddlewareOptions): RequestHandler {
  const boardAuth = boardAuthService(db);
  return async (req, _res, next) => {
    req.actor =
      opts.deploymentMode === "local_trusted"
        ? { type: "board", userId: "local-board", isInstanceAdmin: true, source: "local_implicit" }
        : { type: "none", source: "none" };

    const runIdHeader = req.header("x-agentik-run-id");

    const authHeader = req.header("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      if (opts.deploymentMode === "authenticated" && opts.resolveSession) {
        let session: BetterAuthSessionResult | null = null;
        try {
          session = await opts.resolveSession(req);
        } catch (err) {
          logger.warn(
            { err, method: req.method, url: req.originalUrl },
            "Failed to resolve auth session from request headers",
          );
        }
        if (session?.user?.id) {
          const userId = session.user.id;
          const [roleRow, memberships] = await Promise.all([
            db
              .select({ id: instanceUserRoles.id })
              .from(instanceUserRoles)
              .where(and(eq(instanceUserRoles.userId, userId), eq(instanceUserRoles.role, "instance_admin")))
              .then((rows) => rows[0] ?? null),
            db
              .select({ companyId: companyMemberships.companyId })
              .from(companyMemberships)
              .where(
                and(
                  eq(companyMemberships.principalType, "user"),
                  eq(companyMemberships.principalId, userId),
                  eq(companyMemberships.status, "active"),
                ),
              ),
          ]);
          req.actor = {
            type: "board",
            userId,
            companyIds: memberships.map((row) => row.companyId),
            isInstanceAdmin: Boolean(roleRow),
            runId: runIdHeader ?? undefined,
            source: "session",
          };
          next();
          return;
        }
      }
      if (runIdHeader) req.actor.runId = runIdHeader;
      next();
      return;
    }

    const token = authHeader.slice("bearer ".length).trim();
    if (!token) {
      next();
      return;
    }

    const boardKey = await boardAuth.findBoardApiKeyByToken(token);
    if (boardKey) {
      const access = await boardAuth.resolveBoardAccess(boardKey.userId);
      if (access.user) {
        await boardAuth.touchBoardApiKey(boardKey.id);
        req.actor = {
          type: "board",
          userId: boardKey.userId,
          companyIds: access.companyIds,
          isInstanceAdmin: access.isInstanceAdmin,
          keyId: boardKey.id,
          runId: runIdHeader || undefined,
          source: "board_key",
        };
        next();
        return;
      }
    }

    // Try Clerk JWT verification (for human users sending Bearer tokens)
    const clerkUser = await verifyClerkSession(token);
    if (clerkUser) {
      const userId = clerkUser.userId;
      // Ensure user exists in local DB
      const existingUser = await db
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .then((rows) => rows[0] ?? null);
      if (!existingUser) {
        const now = new Date();
        await db.insert(authUsers).values({
          id: userId,
          name: clerkUser.name ?? "Clerk User",
          email: clerkUser.email ?? `${userId}@clerk.local`,
          emailVerified: true,
          image: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      const [roleRow, memberships] = await Promise.all([
        db
          .select({ id: instanceUserRoles.id })
          .from(instanceUserRoles)
          .where(and(eq(instanceUserRoles.userId, userId), eq(instanceUserRoles.role, "instance_admin")))
          .then((rows) => rows[0] ?? null),
        db
          .select({ companyId: companyMemberships.companyId })
          .from(companyMemberships)
          .where(
            and(
              eq(companyMemberships.principalType, "user"),
              eq(companyMemberships.principalId, userId),
              eq(companyMemberships.status, "active"),
            ),
          ),
      ]);

      const companyIdSet = new Set(memberships.map((row) => row.companyId));

      // Also resolve company access from Clerk org memberships
      if (clerk) {
        try {
          const orgMemberships = await clerk.users.getOrganizationMembershipList({ userId });
          if (orgMemberships.data?.length) {
            const clerkOrgIds = orgMemberships.data.map((m) => m.organization.id);
            const orgCompanies = await db
              .select({ id: companies.id, clerkOrgId: companies.clerkOrgId })
              .from(companies)
              .where(inArray(companies.clerkOrgId, clerkOrgIds));
            for (const row of orgCompanies) {
              companyIdSet.add(row.id);
            }
          }
        } catch (err) {
          logger.warn({ err, userId }, "Failed to resolve Clerk org memberships for company access");
        }
      }

      req.actor = {
        type: "board",
        userId,
        companyIds: Array.from(companyIdSet),
        isInstanceAdmin: Boolean(roleRow),
        runId: runIdHeader ?? undefined,
        source: "clerk_session",
      };
      next();
      return;
    }

    const tokenHash = hashToken(token);
    const key = await db
      .select()
      .from(agentApiKeys)
      .where(and(eq(agentApiKeys.keyHash, tokenHash), isNull(agentApiKeys.revokedAt)))
      .then((rows) => rows[0] ?? null);

    if (!key) {
      const claims = verifyLocalAgentJwt(token);
      if (!claims) {
        next();
        return;
      }

      const agentRecord = await db
        .select()
        .from(agents)
        .where(eq(agents.id, claims.sub))
        .then((rows) => rows[0] ?? null);

      if (!agentRecord || agentRecord.companyId !== claims.company_id) {
        next();
        return;
      }

      if (agentRecord.status === "terminated" || agentRecord.status === "pending_approval") {
        next();
        return;
      }

      req.actor = {
        type: "agent",
        agentId: claims.sub,
        companyId: claims.company_id,
        keyId: undefined,
        runId: runIdHeader || claims.run_id || undefined,
        source: "agent_jwt",
      };
      next();
      return;
    }

    await db
      .update(agentApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(agentApiKeys.id, key.id));

    const agentRecord = await db
      .select()
      .from(agents)
      .where(eq(agents.id, key.agentId))
      .then((rows) => rows[0] ?? null);

    if (!agentRecord || agentRecord.status === "terminated" || agentRecord.status === "pending_approval") {
      next();
      return;
    }

    req.actor = {
      type: "agent",
      agentId: key.agentId,
      companyId: key.companyId,
      keyId: key.id,
      runId: runIdHeader || undefined,
      source: "agent_key",
    };

    next();
  };
}

export function requireBoard(req: Express.Request) {
  return req.actor.type === "board";
}
