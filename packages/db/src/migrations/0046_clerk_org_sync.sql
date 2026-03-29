ALTER TABLE "companies" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_clerk_org_id_idx" ON "companies" ("clerk_org_id") WHERE "clerk_org_id" IS NOT NULL;