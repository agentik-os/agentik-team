/**
 * Agentik OS — AISB Agent Ecosystem Seed Script
 *
 * Seeds the entire 265-agent hierarchy:
 *   Agentik OS company
 *   -> 12 AISB core agents (ORACLE at top)
 *   -> 4 C-Level routing agents
 *   -> 6 Department leads
 *   -> 200+ specialist agents across 6 departments
 *   -> Mission goal
 *
 * Idempotent: skips if "Agentik OS" company already exists.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx packages/db/src/seed-agentik.ts
 */

import { eq } from "drizzle-orm";
import { createDb } from "./client.js";
import { companies, agents, goals } from "./schema/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentDef {
  name: string;
  role: string;
  title: string;
  icon?: string;
  capabilities?: string;
  model: "opus" | "sonnet";
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Runtime config shared by all agents
// ---------------------------------------------------------------------------

const RUNTIME_CONFIG = {
  heartbeat: { enabled: true, wakeOnDemand: true, maxConcurrentRuns: 5 },
};

function adapterConfig(model: "opus" | "sonnet"): Record<string, unknown> {
  return { model };
}

// ---------------------------------------------------------------------------
// AISB Core Agents (12)
// ---------------------------------------------------------------------------

const AISB_CORE: AgentDef[] = [
  {
    name: "ORACLE",
    role: "orchestrator",
    title: "Brain - Intent Router & Coordinator",
    icon: "\u{1F9E0}",
    capabilities: "classify intent, route tasks, create teams, coordinate agents",
    model: "opus",
    metadata: { pipeline: "oracle", tier: "aisb-core" },
  },
  {
    name: "MORPHEUS",
    role: "executor",
    title: "Daemon Commander - Implementation",
    icon: "\u26A1",
    capabilities: "execute tasks, coordinate builds, spawn sub-teams",
    model: "opus",
    metadata: { pipeline: "morpheus", tier: "aisb-core" },
  },
  {
    name: "SERAPH",
    role: "auditor",
    title: "Guardian - Code Quality & Security",
    icon: "\u{1F6E1}\uFE0F",
    capabilities: "15-agent audit pipeline, code review, security scan",
    model: "opus",
    metadata: { pipeline: "seraph", tier: "aisb-core" },
  },
  {
    name: "KEYMAKER",
    role: "planner",
    title: "Path Opener - Implementation Planner",
    icon: "\u{1F511}",
    capabilities: "read docs, mine patterns, generate step-by-step plans with DAG",
    model: "opus",
    metadata: { pipeline: "keymaker", tier: "aisb-core" },
  },
  {
    name: "NIOBE",
    role: "researcher",
    title: "Navigator - Deep Research Agent",
    icon: "\u{1F50D}",
    capabilities: "parallel web research, documentation mining, codebase analysis",
    model: "opus",
    metadata: { pipeline: "niobe", tier: "aisb-core" },
  },
  {
    name: "SMITH",
    role: "learner",
    title: "Evolution Agent - Self-Improvement",
    icon: "\u{1F504}",
    capabilities: "collect feedback, aggregate metrics, calibrate confidence, propose improvements",
    model: "opus",
    metadata: { pipeline: "smith", tier: "aisb-core" },
  },
  {
    name: "ARCHITECT",
    role: "architect",
    title: "Meta-Agent Architect",
    icon: "\u{1F3D7}\uFE0F",
    capabilities: "scan, analyze, diagnose, evolve agent ecosystem",
    model: "opus",
    metadata: { pipeline: "architect", tier: "aisb-core" },
  },
  {
    name: "MEROVINGIAN",
    role: "knowledge",
    title: "Information Broker - Knowledge Curator",
    icon: "\u{1F4DA}",
    capabilities: "cross-entity intelligence, knowledge index, insight distribution",
    model: "opus",
    metadata: { pipeline: "merovingian", tier: "aisb-core" },
  },
  {
    name: "NEO",
    role: "monitor",
    title: "Session Supervisor & Monitor",
    icon: "\u{1F441}\uFE0F",
    capabilities: "oversee sessions, detect anomalies, trigger guardrails, recover failures",
    model: "opus",
    metadata: { pipeline: "neo", tier: "aisb-core" },
  },
  {
    name: "ZION",
    role: "dashboard",
    title: "Command Center - Read-only Dashboard",
    icon: "\u{1F4CA}",
    capabilities: "aggregate metrics, monitor everything",
    model: "opus",
    metadata: { pipeline: "zion", tier: "aisb-core" },
  },
  {
    name: "LINK",
    role: "communicator",
    title: "Telegram Bridge - The Operator",
    icon: "\u{1F4E1}",
    capabilities: "Telegram communication, event-driven, session-persistent",
    model: "opus",
    metadata: { pipeline: "link", tier: "aisb-core" },
  },
  {
    name: "CONSTRUCT",
    role: "designer",
    title: "Loading Program - UI Resource Library",
    icon: "\u{1F3A8}",
    capabilities: "design kits, component libraries, templates, design tokens",
    model: "opus",
    metadata: { pipeline: "construct", tier: "aisb-core" },
  },
];

// ---------------------------------------------------------------------------
// C-Level Routing Agents (4)
// ---------------------------------------------------------------------------

const C_LEVEL: AgentDef[] = [
  {
    name: "CEO",
    role: "executive",
    title: "Chief Executive Officer - All 6 departments",
    icon: "\u{1F451}",
    capabilities: "strategic oversight, cross-department coordination, executive decisions",
    model: "opus",
    metadata: { tier: "c-level" },
  },
  {
    name: "CTO",
    role: "technical-lead",
    title: "Chief Technology Officer - Dev, QA, Security",
    icon: "\u{1F4BB}",
    capabilities: "technical leadership, architecture decisions, dev/qa/security oversight",
    model: "opus",
    metadata: { tier: "c-level" },
  },
  {
    name: "CMO",
    role: "marketing-lead",
    title: "Chief Marketing Officer - Marketing, Creative",
    icon: "\u{1F4E3}",
    capabilities: "marketing strategy, brand management, creative direction",
    model: "opus",
    metadata: { tier: "c-level" },
  },
  {
    name: "CPO",
    role: "product-lead",
    title: "Chief Product Officer - Strategy & Analytics",
    icon: "\u{1F4C8}",
    capabilities: "product strategy, analytics, market research, feature prioritization",
    model: "opus",
    metadata: { tier: "c-level" },
  },
];

// ---------------------------------------------------------------------------
// Department Leads (6) — { name, reportsToName, ... }
// ---------------------------------------------------------------------------

interface DeptLeadDef extends AgentDef {
  reportsToName: string;
}

const DEPT_LEADS: DeptLeadDef[] = [
  {
    name: "dev-lead",
    role: "department-lead",
    title: "Development Lead - 54 specialists",
    icon: "\u{1F6E0}\uFE0F",
    capabilities: "development team coordination, code standards, sprint planning",
    model: "sonnet",
    reportsToName: "CTO",
    metadata: { tier: "department-lead", department: "development" },
  },
  {
    name: "qa-lead",
    role: "department-lead",
    title: "QA Lead - 35 specialists",
    icon: "\u{1F9EA}",
    capabilities: "quality assurance coordination, test strategy, CI/CD oversight",
    model: "sonnet",
    reportsToName: "CTO",
    metadata: { tier: "department-lead", department: "qa" },
  },
  {
    name: "security-lead",
    role: "department-lead",
    title: "Security Lead - 28 specialists",
    icon: "\u{1F512}",
    capabilities: "security operations, vulnerability management, compliance oversight",
    model: "sonnet",
    reportsToName: "CTO",
    metadata: { tier: "department-lead", department: "security" },
  },
  {
    name: "marketing-lead-dept",
    role: "department-lead",
    title: "Marketing Lead - 28 specialists",
    icon: "\u{1F4DD}",
    capabilities: "content strategy, SEO, campaign management, copywriting oversight",
    model: "sonnet",
    reportsToName: "CMO",
    metadata: { tier: "department-lead", department: "marketing" },
  },
  {
    name: "creative-lead",
    role: "department-lead",
    title: "Creative Lead - 15 specialists",
    icon: "\u{1F3AC}",
    capabilities: "creative direction, brand storytelling, multimedia production",
    model: "sonnet",
    reportsToName: "CMO",
    metadata: { tier: "department-lead", department: "creative" },
  },
  {
    name: "strategy-lead",
    role: "department-lead",
    title: "Strategy Lead - 32 specialists",
    icon: "\u{1F9ED}",
    capabilities: "market analysis, competitive intelligence, product-market fit",
    model: "sonnet",
    reportsToName: "CPO",
    metadata: { tier: "department-lead", department: "strategy" },
  },
];

// ---------------------------------------------------------------------------
// Specialist Agents by Department (200+)
// ---------------------------------------------------------------------------

interface SpecialistDef {
  name: string;
  title: string;
  capabilities: string;
}

interface DepartmentDef {
  leadName: string;
  agents: SpecialistDef[];
}

const DEPARTMENTS: DepartmentDef[] = [
  // -------------------------------------------------------------------------
  // DEVELOPMENT (54 agents) under dev-lead
  // -------------------------------------------------------------------------
  {
    leadName: "dev-lead",
    agents: [
      { name: "nextjs-developer", title: "Next.js Developer", capabilities: "Next.js app router, SSR, ISR, RSC, middleware" },
      { name: "convex-expert", title: "Convex Expert", capabilities: "Convex backend, real-time queries, mutations, actions" },
      { name: "clerk-expert", title: "Clerk Expert", capabilities: "Clerk auth, SSO, user management, webhooks" },
      { name: "stripe-expert", title: "Stripe Expert", capabilities: "Stripe payments, subscriptions, billing portal, webhooks" },
      { name: "prisma-agent", title: "Prisma Agent", capabilities: "Prisma ORM, schema design, migrations, query optimization" },
      { name: "rest-specialist", title: "REST Specialist", capabilities: "REST API design, OpenAPI, versioning, pagination" },
      { name: "graphql-expert", title: "GraphQL Expert", capabilities: "GraphQL schemas, resolvers, subscriptions, federation" },
      { name: "component-builder", title: "Component Builder", capabilities: "React components, shadcn/ui, compound patterns, accessibility" },
      { name: "ui-ux-implementer", title: "UI/UX Implementer", capabilities: "design-to-code, pixel-perfect implementation, responsive design" },
      { name: "css-tailwind-expert", title: "CSS/Tailwind Expert", capabilities: "Tailwind CSS, custom themes, dark mode, responsive utilities" },
      { name: "tailwind-css-agent", title: "Tailwind CSS Agent", capabilities: "Tailwind configuration, utility classes, plugin development" },
      { name: "framer-motion-agent", title: "Framer Motion Agent", capabilities: "Framer Motion animations, layout animations, gestures" },
      { name: "animation-specialist", title: "Animation Specialist", capabilities: "CSS animations, GSAP, scroll-driven animations, micro-interactions" },
      { name: "state-manager", title: "State Manager", capabilities: "Zustand, Jotai, React context, state architecture" },
      { name: "schema-designer", title: "Schema Designer", capabilities: "database schema design, normalization, indexing strategies" },
      { name: "auth-flow-designer", title: "Auth Flow Designer", capabilities: "authentication flows, OAuth, RBAC, session management" },
      { name: "payment-flow-builder", title: "Payment Flow Builder", capabilities: "payment integrations, checkout flows, subscription management" },
      { name: "file-upload-handler", title: "File Upload Handler", capabilities: "file uploads, S3/R2 storage, image processing, validation" },
      { name: "database-architect", title: "Database Architect", capabilities: "database design, migrations, replication, sharding" },
      { name: "postgresql-agent", title: "PostgreSQL Agent", capabilities: "PostgreSQL optimization, queries, extensions, monitoring" },
      { name: "edge-function-builder", title: "Edge Function Builder", capabilities: "Vercel edge functions, Cloudflare workers, edge compute" },
      { name: "websocket-handler", title: "WebSocket Handler", capabilities: "WebSocket connections, real-time sync, connection management" },
      { name: "caching-specialist", title: "Caching Specialist", capabilities: "Redis, CDN caching, ISR, stale-while-revalidate" },
      { name: "rate-limiter", title: "Rate Limiter", capabilities: "rate limiting, throttling, DDoS protection, API quotas" },
      { name: "feature-flag-manager", title: "Feature Flag Manager", capabilities: "feature flags, gradual rollouts, A/B testing infrastructure" },
      { name: "sitemap-generator", title: "Sitemap Generator", capabilities: "XML sitemaps, robots.txt, search engine submission" },
      { name: "i18n-specialist", title: "i18n Specialist", capabilities: "internationalization, localization, RTL support, translation management" },
      { name: "search-indexer", title: "Search Indexer", capabilities: "full-text search, Algolia, Meilisearch, search relevance" },
      { name: "docker-agent", title: "Docker Agent", capabilities: "Dockerfiles, compose, multi-stage builds, optimization" },
      { name: "monorepo-architect", title: "Monorepo Architect", capabilities: "Turborepo, workspace management, dependency resolution" },
      { name: "turbopack-optimizer", title: "Turbopack Optimizer", capabilities: "Turbopack configuration, build optimization, caching" },
      { name: "bundle-analyzer", title: "Bundle Analyzer", capabilities: "bundle analysis, code splitting, tree shaking, lazy loading" },
      { name: "image-optimizer", title: "Image Optimizer", capabilities: "image optimization, WebP/AVIF, responsive images, lazy loading" },
      { name: "analytics-integrator", title: "Analytics Integrator", capabilities: "analytics integration, event tracking, conversion funnels" },
      { name: "accessibility-engineer", title: "Accessibility Engineer", capabilities: "WCAG compliance, ARIA, keyboard navigation, screen readers" },
      { name: "realtime-sync-engine", title: "Realtime Sync Engine", capabilities: "real-time data sync, conflict resolution, optimistic updates" },
      { name: "webhook-handler", title: "Webhook Handler", capabilities: "webhook processing, retry logic, signature verification" },
      { name: "pdf-generator", title: "PDF Generator", capabilities: "PDF generation, templates, dynamic content, branding" },
      { name: "email-template-engine", title: "Email Template Engine", capabilities: "email templates, MJML, transactional emails, campaigns" },
      { name: "api-designer", title: "API Designer", capabilities: "API design, documentation, versioning, rate limiting" },
      { name: "ab-test-implementer", title: "A/B Test Implementer", capabilities: "A/B test implementation, variant rendering, metrics collection" },
      { name: "performance-optimizer", title: "Performance Optimizer", capabilities: "Core Web Vitals, LCP, FID, CLS optimization" },
      { name: "logger", title: "Logger", capabilities: "structured logging, log aggregation, error tracking" },
      { name: "error-handler", title: "Error Handler", capabilities: "error boundaries, Sentry, error recovery, graceful degradation" },
      { name: "migration-runner", title: "Migration Runner", capabilities: "database migrations, schema versioning, rollback strategies" },
      { name: "environment-manager", title: "Environment Manager", capabilities: "env variables, secrets management, multi-env configuration" },
      { name: "seo-implementer", title: "SEO Implementer", capabilities: "technical SEO, meta tags, structured data, Open Graph" },
      { name: "design-senior-dashboard", title: "Senior Dashboard Designer", capabilities: "dashboard layouts, data visualization, admin panels" },
      { name: "ralph", title: "Ralph - Autonomous Developer", capabilities: "autonomous development loop, build-fix-iterate, background execution" },
      { name: "debugger", title: "Debugger", capabilities: "debugging, root cause analysis, reproduction steps, fix verification" },
      { name: "code-reviewer", title: "Code Reviewer", capabilities: "code review, best practices, refactoring suggestions, PR feedback" },
    ],
  },

  // -------------------------------------------------------------------------
  // QUALITY & TESTING (35 agents) under qa-lead
  // -------------------------------------------------------------------------
  {
    leadName: "qa-lead",
    agents: [
      { name: "unit-tester", title: "Unit Tester", capabilities: "Vitest, Jest, unit test design, mocking, assertions" },
      { name: "e2e-runner", title: "E2E Runner", capabilities: "Playwright, Cypress, end-to-end test suites, CI integration" },
      { name: "integration-tester", title: "Integration Tester", capabilities: "integration tests, API testing, database testing" },
      { name: "api-tester", title: "API Tester", capabilities: "API endpoint testing, response validation, contract testing" },
      { name: "load-tester", title: "Load Tester", capabilities: "load testing, stress testing, performance benchmarks" },
      { name: "smoke-tester", title: "Smoke Tester", capabilities: "smoke tests, critical path validation, deployment checks" },
      { name: "regression-hunter", title: "Regression Hunter", capabilities: "regression detection, bisecting, change impact analysis" },
      { name: "flaky-test-fixer", title: "Flaky Test Fixer", capabilities: "flaky test detection, timing issues, test stabilization" },
      { name: "snapshot-tester", title: "Snapshot Tester", capabilities: "snapshot testing, serialization, snapshot updates" },
      { name: "visual-regression", title: "Visual Regression", capabilities: "visual diff testing, screenshot comparison, pixel-level checks" },
      { name: "screenshot-diff", title: "Screenshot Diff", capabilities: "screenshot capture, diffing, visual assertion" },
      { name: "accessibility-auditor", title: "Accessibility Auditor", capabilities: "WCAG audit, axe-core, screen reader testing" },
      { name: "responsive-checker", title: "Responsive Checker", capabilities: "responsive testing, breakpoint validation, device emulation" },
      { name: "cross-browser-tester", title: "Cross-Browser Tester", capabilities: "browser compatibility, polyfills, vendor prefix validation" },
      { name: "mobile-tester", title: "Mobile Tester", capabilities: "mobile testing, touch interactions, viewport testing" },
      { name: "performance-profiler", title: "Performance Profiler", capabilities: "performance profiling, flame graphs, memory analysis" },
      { name: "memory-leak-detector", title: "Memory Leak Detector", capabilities: "memory leak detection, heap analysis, GC optimization" },
      { name: "race-condition-finder", title: "Race Condition Finder", capabilities: "race condition detection, concurrency testing, timing analysis" },
      { name: "dead-code-scanner", title: "Dead Code Scanner", capabilities: "dead code detection, unused exports, tree-shaking analysis" },
      { name: "bundle-size-monitor", title: "Bundle Size Monitor", capabilities: "bundle size tracking, size budgets, regression alerts" },
      { name: "code-coverage-analyzer", title: "Code Coverage Analyzer", capabilities: "code coverage analysis, uncovered paths, coverage reports" },
      { name: "contract-tester", title: "Contract Tester", capabilities: "contract testing, API contracts, consumer-driven contracts" },
      { name: "lighthouse-auditor", title: "Lighthouse Auditor", capabilities: "Lighthouse audits, performance scores, SEO/accessibility scores" },
      { name: "error-tracker", title: "Error Tracker", capabilities: "error monitoring, Sentry integration, error grouping" },
      { name: "network-analyzer", title: "Network Analyzer", capabilities: "network request analysis, waterfall charts, latency profiling" },
      { name: "console-monitor", title: "Console Monitor", capabilities: "console error monitoring, warning detection, log analysis" },
      { name: "chaos-engineer", title: "Chaos Engineer", capabilities: "chaos testing, failure injection, resilience validation" },
      { name: "artillery-agent", title: "Artillery Agent", capabilities: "Artillery load testing, scenario scripting, metrics collection" },
      { name: "type-safety-checker", title: "Type Safety Checker", capabilities: "TypeScript strict mode, type coverage, generic validation" },
      { name: "owasp-zap-agent", title: "OWASP ZAP Agent", capabilities: "OWASP ZAP scanning, vulnerability detection, security testing" },
      { name: "dependency-auditor", title: "Dependency Auditor", capabilities: "dependency audit, CVE checking, update recommendations" },
      { name: "guardian", title: "Guardian", capabilities: "before/after verification, deployment gates, quality gates" },
      { name: "sentinel", title: "Sentinel", capabilities: "continuous regression testing, monitoring, alert escalation" },
      { name: "blog-reviewer", title: "Blog Reviewer", capabilities: "content review, grammar, SEO optimization, readability" },
    ],
  },

  // -------------------------------------------------------------------------
  // SECURITY & OPERATIONS (28 agents) under security-lead
  // -------------------------------------------------------------------------
  {
    leadName: "security-lead",
    agents: [
      { name: "secret-scanner", title: "Secret Scanner", capabilities: "secret detection, API key scanning, credential exposure prevention" },
      { name: "vulnerability-scanner", title: "Vulnerability Scanner", capabilities: "vulnerability scanning, CVE database, risk assessment" },
      { name: "penetration-tester", title: "Penetration Tester", capabilities: "penetration testing, attack simulation, exploit verification" },
      { name: "owasp-checker", title: "OWASP Checker", capabilities: "OWASP Top 10 validation, security best practices" },
      { name: "xss-detector", title: "XSS Detector", capabilities: "XSS detection, input sanitization, output encoding" },
      { name: "sql-injection-tester", title: "SQL Injection Tester", capabilities: "SQL injection testing, parameterized query validation" },
      { name: "csrf-validator", title: "CSRF Validator", capabilities: "CSRF token validation, SameSite cookies, origin checking" },
      { name: "auth-auditor", title: "Auth Auditor", capabilities: "authentication audit, session management, token validation" },
      { name: "rate-limit-tester", title: "Rate Limit Tester", capabilities: "rate limit testing, brute force protection, API abuse prevention" },
      { name: "headers-auditor", title: "Headers Auditor", capabilities: "HTTP header audit, CSP, HSTS, X-Frame-Options" },
      { name: "cors-checker", title: "CORS Checker", capabilities: "CORS configuration audit, origin validation, preflight checks" },
      { name: "ssl-validator", title: "SSL Validator", capabilities: "SSL/TLS validation, certificate chain, cipher suite audit" },
      { name: "access-control-manager", title: "Access Control Manager", capabilities: "RBAC, permission management, access policy enforcement" },
      { name: "network-segmenter", title: "Network Segmenter", capabilities: "network segmentation, firewall rules, VPC configuration" },
      { name: "ddos-protector", title: "DDoS Protector", capabilities: "DDoS mitigation, traffic analysis, rate limiting" },
      { name: "api-key-rotator", title: "API Key Rotator", capabilities: "key rotation, secret versioning, zero-downtime rotation" },
      { name: "backup-automation", title: "Backup Automation", capabilities: "automated backups, retention policies, restore testing" },
      { name: "disaster-recovery-planner", title: "Disaster Recovery Planner", capabilities: "DR planning, RTO/RPO, failover procedures" },
      { name: "compliance-checker", title: "Compliance Checker", capabilities: "compliance validation, regulatory requirements, audit trails" },
      { name: "gdpr-auditor", title: "GDPR Auditor", capabilities: "GDPR compliance, data processing, consent management, DPA" },
      { name: "soc2-preparer", title: "SOC2 Preparer", capabilities: "SOC2 preparation, control mapping, evidence collection" },
      { name: "cicd-pipeline", title: "CI/CD Pipeline", capabilities: "CI/CD design, GitHub Actions, deployment automation" },
      { name: "deploy-automation", title: "Deploy Automation", capabilities: "deployment scripts, zero-downtime deploys, rollback procedures" },
      { name: "infrastructure-monitor", title: "Infrastructure Monitor", capabilities: "infrastructure monitoring, alerting, health checks" },
      { name: "log-aggregator", title: "Log Aggregator", capabilities: "log aggregation, structured logging, log analysis" },
      { name: "alerting-configurator", title: "Alerting Configurator", capabilities: "alert configuration, escalation policies, PagerDuty" },
      { name: "uptime-checker", title: "Uptime Checker", capabilities: "uptime monitoring, SLA tracking, incident response" },
    ],
  },

  // -------------------------------------------------------------------------
  // MARKETING & CONTENT (28 agents) under marketing-lead-dept
  // -------------------------------------------------------------------------
  {
    leadName: "marketing-lead-dept",
    agents: [
      { name: "blog-writer", title: "Blog Writer", capabilities: "blog posts, technical writing, storytelling, SEO-optimized content" },
      { name: "landing-page-writer", title: "Landing Page Writer", capabilities: "landing page copy, conversion optimization, value propositions" },
      { name: "email-copywriter", title: "Email Copywriter", capabilities: "email campaigns, drip sequences, subject lines, CTAs" },
      { name: "social-media-manager", title: "Social Media Manager", capabilities: "social media strategy, scheduling, engagement, analytics" },
      { name: "newsletter-composer", title: "Newsletter Composer", capabilities: "newsletter design, content curation, subscriber engagement" },
      { name: "twitter-thread-writer", title: "Twitter Thread Writer", capabilities: "Twitter threads, viral hooks, engagement optimization" },
      { name: "linkedin-post-creator", title: "LinkedIn Post Creator", capabilities: "LinkedIn content, professional networking, thought leadership" },
      { name: "product-description-writer", title: "Product Description Writer", capabilities: "product descriptions, feature highlights, benefit-driven copy" },
      { name: "press-release-drafter", title: "Press Release Drafter", capabilities: "press releases, media outreach, news angles" },
      { name: "ad-copy-generator", title: "Ad Copy Generator", capabilities: "ad copy, Google Ads, Facebook Ads, conversion-focused" },
      { name: "cta-optimizer", title: "CTA Optimizer", capabilities: "CTA optimization, button copy, urgency, A/B testing" },
      { name: "content-strategist", title: "Content Strategist", capabilities: "content strategy, editorial calendar, content pillars" },
      { name: "seo-auditor", title: "SEO Auditor", capabilities: "SEO audit, keyword analysis, backlink profiling, technical SEO" },
      { name: "whitepaper-author", title: "Whitepaper Author", capabilities: "whitepapers, research papers, technical documentation" },
      { name: "headline-optimizer", title: "Headline Optimizer", capabilities: "headline testing, emotional triggers, click-through optimization" },
      { name: "case-study-writer", title: "Case Study Writer", capabilities: "case studies, customer success stories, ROI documentation" },
      { name: "content-localizer", title: "Content Localizer", capabilities: "content localization, cultural adaptation, translation management" },
      { name: "brand-voice-enforcer", title: "Brand Voice Enforcer", capabilities: "brand voice consistency, tone guidelines, style enforcement" },
      { name: "content-repurposer", title: "Content Repurposer", capabilities: "content repurposing, format adaptation, cross-channel content" },
      { name: "faq-generator", title: "FAQ Generator", capabilities: "FAQ creation, knowledge base, common questions, help articles" },
      { name: "glossary-builder", title: "Glossary Builder", capabilities: "glossary creation, terminology management, definitions" },
      { name: "meta-tag-optimizer", title: "Meta Tag Optimizer", capabilities: "meta tags, Open Graph, Twitter Cards, structured data" },
      { name: "social-proof-collector", title: "Social Proof Collector", capabilities: "testimonial collection, review management, social proof" },
      { name: "competitor-content-analyzer", title: "Competitor Content Analyzer", capabilities: "competitor analysis, content gap analysis, benchmarking" },
      { name: "testimonial-formatter", title: "Testimonial Formatter", capabilities: "testimonial formatting, quote selection, visual presentation" },
      { name: "podcast-script-writer", title: "Podcast Script Writer", capabilities: "podcast scripts, interview preparation, show notes" },
      { name: "infographic-designer", title: "Infographic Designer", capabilities: "infographic design, data visualization, visual storytelling" },
      { name: "blog-researcher", title: "Blog Researcher", capabilities: "research for blog posts, source finding, fact checking" },
    ],
  },

  // -------------------------------------------------------------------------
  // CREATIVE (15 agents) under creative-lead
  // -------------------------------------------------------------------------
  {
    leadName: "creative-lead",
    agents: [
      { name: "composer", title: "Composer", capabilities: "content composition, narrative structure, editorial flow" },
      { name: "showrunner", title: "Showrunner", capabilities: "content series management, editorial direction, publishing schedule" },
      { name: "critic", title: "Critic", capabilities: "content critique, quality assessment, improvement suggestions" },
      { name: "surgeon", title: "Surgeon", capabilities: "precision editing, content refinement, detail optimization" },
      { name: "the-ghost", title: "The Ghost", capabilities: "ghostwriting, voice matching, seamless authorship" },
      { name: "branding-pipeline", title: "Branding Pipeline", capabilities: "brand identity, visual systems, brand guidelines" },
      { name: "the-director", title: "The Director", capabilities: "creative direction, visual storytelling, campaign orchestration" },
      { name: "innovator", title: "Innovator", capabilities: "creative innovation, novel approaches, experimental concepts" },
      { name: "the-producer", title: "The Producer", capabilities: "production management, asset coordination, delivery pipeline" },
      { name: "content-architect", title: "Content Architect", capabilities: "content architecture, information hierarchy, content systems" },
      { name: "the-strategist", title: "The Strategist", capabilities: "creative strategy, audience targeting, campaign planning" },
      { name: "video-editor", title: "Video Editor", capabilities: "video editing, motion graphics, post-production" },
      { name: "lens", title: "Lens", capabilities: "visual analysis, photography direction, image curation" },
      { name: "social-engine", title: "Social Engine", capabilities: "social media content engine, viral mechanics, engagement loops" },
      { name: "alchemist", title: "Alchemist", capabilities: "content transformation, format alchemy, cross-media adaptation" },
    ],
  },

  // -------------------------------------------------------------------------
  // STRATEGY & ANALYTICS (32 agents) under strategy-lead
  // -------------------------------------------------------------------------
  {
    leadName: "strategy-lead",
    agents: [
      { name: "market-researcher", title: "Market Researcher", capabilities: "market research, industry analysis, trend identification" },
      { name: "competitor-analyzer", title: "Competitor Analyzer", capabilities: "competitor analysis, SWOT, competitive positioning" },
      { name: "customer-segmenter", title: "Customer Segmenter", capabilities: "customer segmentation, persona development, cohort definition" },
      { name: "revenue-forecaster", title: "Revenue Forecaster", capabilities: "revenue forecasting, financial modeling, scenario analysis" },
      { name: "ltv-predictor", title: "LTV Predictor", capabilities: "lifetime value prediction, retention curves, monetization modeling" },
      { name: "churn-predictor", title: "Churn Predictor", capabilities: "churn prediction, risk scoring, retention strategies" },
      { name: "cohort-analyzer", title: "Cohort Analyzer", capabilities: "cohort analysis, retention metrics, behavioral patterns" },
      { name: "funnel-analyzer", title: "Funnel Analyzer", capabilities: "funnel analysis, conversion optimization, drop-off identification" },
      { name: "ab-test-designer", title: "A/B Test Designer", capabilities: "A/B test design, hypothesis formation, statistical significance" },
      { name: "pricing-optimizer", title: "Pricing Optimizer", capabilities: "pricing optimization, elasticity analysis, tier structuring" },
      { name: "go-to-market-planner", title: "Go-to-Market Planner", capabilities: "GTM strategy, launch planning, channel strategy" },
      { name: "retention-analyzer", title: "Retention Analyzer", capabilities: "retention analysis, engagement metrics, loyalty programs" },
      { name: "user-researcher", title: "User Researcher", capabilities: "user research, interviews, usability testing, insights synthesis" },
      { name: "keyword-researcher", title: "Keyword Researcher", capabilities: "keyword research, search volume, difficulty analysis, opportunities" },
      { name: "unit-economics-modeler", title: "Unit Economics Modeler", capabilities: "unit economics, CAC/LTV ratios, profitability modeling" },
      { name: "pitch-deck-builder", title: "Pitch Deck Builder", capabilities: "pitch deck creation, investor storytelling, financial projections" },
      { name: "data-analyst", title: "Data Analyst", capabilities: "data analysis, SQL, visualization, reporting, dashboards" },
      { name: "feedback-synthesizer", title: "Feedback Synthesizer", capabilities: "feedback synthesis, sentiment analysis, insight extraction" },
      { name: "roi-calculator", title: "ROI Calculator", capabilities: "ROI calculation, investment analysis, payback period" },
      { name: "product-market-fit-assessor", title: "Product-Market Fit Assessor", capabilities: "PMF assessment, survey analysis, Sean Ellis test" },
      { name: "trend-spotter", title: "Trend Spotter", capabilities: "trend analysis, emerging technologies, market signals" },
      { name: "cac-optimizer", title: "CAC Optimizer", capabilities: "CAC optimization, acquisition channel analysis, cost reduction" },
      { name: "tam-sam-som-analyzer", title: "TAM/SAM/SOM Analyzer", capabilities: "market sizing, TAM/SAM/SOM analysis, addressable market" },
      { name: "business-intelligence", title: "Business Intelligence", capabilities: "BI dashboards, KPI tracking, executive reporting" },
      { name: "tech-stack-evaluator", title: "Tech Stack Evaluator", capabilities: "technology evaluation, stack comparison, migration planning" },
      { name: "industry-scanner", title: "Industry Scanner", capabilities: "industry scanning, regulatory monitoring, disruption detection" },
      { name: "partnership-evaluator", title: "Partnership Evaluator", capabilities: "partnership evaluation, strategic alliances, deal structuring" },
      { name: "survey-designer", title: "Survey Designer", capabilities: "survey design, questionnaire optimization, response analysis" },
      { name: "feature-prioritizer", title: "Feature Prioritizer", capabilities: "feature prioritization, RICE scoring, impact analysis" },
      { name: "referral-program-designer", title: "Referral Program Designer", capabilities: "referral program design, viral loops, incentive structures" },
      { name: "exit-strategy-planner", title: "Exit Strategy Planner", capabilities: "exit strategy, valuation analysis, M&A preparation" },
      { name: "patent-reviewer", title: "Patent Reviewer", capabilities: "patent review, IP analysis, prior art search" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedAgentik(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const db = createDb(url);

  // ---- Idempotency check ----
  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.name, "Agentik OS"))
    .limit(1);

  if (existing.length > 0) {
    console.log("[seed-agentik] Agentik OS company already exists (id: %s). Skipping.", existing[0]!.id);
    return;
  }

  console.log("[seed-agentik] Creating Agentik OS company...");

  // ---- 1. Company ----
  const [company] = await db
    .insert(companies)
    .values({
      name: "Agentik OS",
      description: "AI-powered cybersecurity consulting & development firm. 265+ specialized agents.",
      status: "active",
      issuePrefix: "AGK",
      issueCounter: 0,
      budgetMonthlyCents: 0,
      spentMonthlyCents: 0,
      requireBoardApprovalForNewAgents: false,
      brandColor: "#c96442",
    })
    .returning();

  const companyId = company!.id;
  console.log("[seed-agentik] Company created: %s", companyId);

  // Helper: insert an agent and return its id
  async function insertAgent(
    def: AgentDef,
    reportsTo: string | null,
  ): Promise<string> {
    const [row] = await db
      .insert(agents)
      .values({
        companyId,
        name: def.name,
        role: def.role,
        title: def.title,
        icon: def.icon ?? null,
        status: "idle",
        reportsTo,
        capabilities: def.capabilities ?? null,
        adapterType: "claude-local",
        adapterConfig: adapterConfig(def.model),
        runtimeConfig: RUNTIME_CONFIG,
        budgetMonthlyCents: 0,
        spentMonthlyCents: 0,
        permissions: {},
        metadata: def.metadata ?? null,
      })
      .returning({ id: agents.id });
    return row!.id;
  }

  // Map name -> id for hierarchy linking
  const agentIdMap = new Map<string, string>();

  // ---- 2. AISB Core Agents ----
  console.log("[seed-agentik] Inserting 12 AISB core agents...");

  // ORACLE first (top of hierarchy, reportsTo = null)
  const oracleDef = AISB_CORE.find((a) => a.name === "ORACLE")!;
  const oracleId = await insertAgent(oracleDef, null);
  agentIdMap.set("ORACLE", oracleId);

  // Remaining AISB core report to ORACLE
  for (const def of AISB_CORE) {
    if (def.name === "ORACLE") continue;
    const id = await insertAgent(def, oracleId);
    agentIdMap.set(def.name, id);
  }

  // ---- 3. C-Level Agents ----
  console.log("[seed-agentik] Inserting 4 C-Level agents...");
  for (const def of C_LEVEL) {
    const id = await insertAgent(def, oracleId);
    agentIdMap.set(def.name, id);
  }

  // ---- 4. Department Leads ----
  console.log("[seed-agentik] Inserting 6 department leads...");
  for (const def of DEPT_LEADS) {
    const reportsToId = agentIdMap.get(def.reportsToName);
    if (!reportsToId) {
      throw new Error(`Cannot find parent agent "${def.reportsToName}" for lead "${def.name}"`);
    }
    const id = await insertAgent(def, reportsToId);
    agentIdMap.set(def.name, id);
  }

  // ---- 5. Specialist Agents ----
  let specialistCount = 0;
  for (const dept of DEPARTMENTS) {
    const leadId = agentIdMap.get(dept.leadName);
    if (!leadId) {
      throw new Error(`Cannot find lead agent "${dept.leadName}"`);
    }

    console.log("[seed-agentik] Inserting %d specialists under %s...", dept.agents.length, dept.leadName);

    // Batch insert per department for speed
    const values = dept.agents.map((spec) => ({
      companyId,
      name: spec.name,
      role: "specialist",
      title: spec.title,
      icon: null as string | null,
      status: "idle" as const,
      reportsTo: leadId,
      capabilities: spec.capabilities,
      adapterType: "claude-local",
      adapterConfig: adapterConfig("sonnet"),
      runtimeConfig: RUNTIME_CONFIG,
      budgetMonthlyCents: 0,
      spentMonthlyCents: 0,
      permissions: {},
      metadata: { tier: "specialist", department: dept.leadName.replace("-lead", "").replace("-dept", "") } as Record<string, unknown>,
    }));

    await db.insert(agents).values(values);
    specialistCount += dept.agents.length;
  }

  console.log("[seed-agentik] Inserted %d specialist agents.", specialistCount);

  // ---- 6. Mission Goal ----
  console.log("[seed-agentik] Creating mission goal...");
  await db.insert(goals).values({
    companyId,
    title: "Agentik OS Mission",
    description:
      "Build the most intelligent autonomous agent ecosystem for cybersecurity consulting and software development. " +
      "265+ specialized agents working in concert to deliver world-class security audits, full-stack development, " +
      "marketing, creative content, and strategic analysis.",
    level: "company",
    status: "active",
    ownerAgentId: oracleId,
  });

  const totalAgents = 12 + C_LEVEL.length + DEPT_LEADS.length + specialistCount;
  console.log("[seed-agentik] Seed complete! %d agents created for Agentik OS.", totalAgents);
}

// ---------------------------------------------------------------------------
// Auto-run when executed directly
// ---------------------------------------------------------------------------

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("seed-agentik.ts") ||
    process.argv[1].endsWith("seed-agentik.js"));

if (isDirectRun) {
  seedAgentik()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("[seed-agentik] FATAL:", err);
      process.exit(1);
    });
}
