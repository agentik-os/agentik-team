#!/usr/bin/env npx tsx
/**
 * Import agents from ~/.claude/agents/ into the Agentik Team database.
 *
 * Reads all .md files recursively, parses YAML frontmatter for name/description,
 * and POSTs to the local API to create each agent.
 *
 * Usage:
 *   npx tsx scripts/import-agents.ts [--dry-run] [--adapter-type claude_local]
 *
 * The server must be running on localhost:3100.
 * Local requests get implicit board auth (no token needed).
 */
import * as fs from "fs";
import * as path from "path";

// ── Config ──────────────────────────────────────────────────────────
const AGENTS_DIR = path.join(process.env.HOME ?? "/home/hacker", ".claude/agents");
const API_BASE = process.env.API_BASE ?? "http://localhost:3100/api";
const DRY_RUN = process.argv.includes("--dry-run");

// Adapter type: default to claude_local (agentik_tmux once available)
const adapterTypeArg = process.argv.find((a) => a.startsWith("--adapter-type="));
const ADAPTER_TYPE = adapterTypeArg?.split("=")[1] ?? "claude_local";

// ── YAML frontmatter parser ─────────────────────────────────────────
interface AgentFrontmatter {
  name: string;
  description: string;
  model?: string;
  tools?: string;
  context?: string;
}

function parseFrontmatter(content: string): { data: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const yamlStr = match[1];
  const body = match[2];
  const data: Record<string, string> = {};

  let currentKey: string | null = null;
  let currentValue = "";

  for (const line of yamlStr.split("\n")) {
    // Continuation of multi-line value (indented)
    if (currentKey && /^\s+/.test(line) && !line.match(/^\w[\w-]*\s*:/)) {
      currentValue += " " + line.trim();
      continue;
    }

    // Save previous key
    if (currentKey !== null) {
      data[currentKey] = currentValue.trim();
    }

    // Key: value line
    const kvMatch = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      currentValue = kvMatch[2].replace(/^>\s*$/, "").replace(/^["']|["']$/g, "");
    } else {
      currentKey = null;
      currentValue = "";
    }
  }

  // Save last key
  if (currentKey !== null) {
    data[currentKey] = currentValue.trim();
  }

  return { data, body };
}

// ── Recursively find .md files ──────────────────────────────────────
function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "CLAUDE.md") {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Derive department from subdirectory ─────────────────────────────
function getDepartment(filePath: string): string | null {
  const relative = path.relative(AGENTS_DIR, filePath);
  const parts = relative.split(path.sep);
  return parts.length > 1 ? parts[0] : null;
}

// ── Map department to role ──────────────────────────────────────────
function mapRole(department: string | null, name: string): string {
  const roleMap: Record<string, string> = {
    "c-level": "executive",
  };
  if (department && roleMap[department]) return roleMap[department];

  // Check if name matches a known C-level pattern
  if (["ceo", "cto", "cmo", "cpo"].includes(name)) return "executive";

  return "general";
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📂 Scanning agents in: ${AGENTS_DIR}`);
  console.log(`🔗 API: ${API_BASE}`);
  console.log(`🔧 Adapter: ${ADAPTER_TYPE}`);
  if (DRY_RUN) console.log("🏜️  DRY RUN — no API calls will be made\n");

  // Step 1: Discover company ID
  let companyId: string;
  if (DRY_RUN) {
    companyId = "dry-run-company-id";
    console.log(`🏢 Using company: dry-run (skipping API)\n`);
  } else {
    try {
      const res = await fetch(`${API_BASE}/companies`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const companies = (await res.json()) as Array<{ id: string; name: string }>;
      if (companies.length === 0) {
        console.error("❌ No companies found. Create a company first.");
        process.exit(1);
      }
      companyId = companies[0].id;
      console.log(`🏢 Using company: ${companies[0].name} (${companyId})\n`);
    } catch (err) {
      console.error("❌ Failed to fetch companies. Is the server running on localhost:3100?");
      console.error(err);
      process.exit(1);
    }
  }

  // Step 2: Get existing agents to skip duplicates
  let existingNames: Set<string>;
  if (!DRY_RUN) {
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/agents`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const agents = (await res.json()) as Array<{ name: string }>;
      existingNames = new Set(agents.map((a) => a.name.toLowerCase()));
      console.log(`📋 ${existingNames.size} agents already exist\n`);
    } catch {
      existingNames = new Set();
    }
  } else {
    existingNames = new Set();
  }

  // Step 3: Find and parse all agent files
  const files = findMdFiles(AGENTS_DIR);
  console.log(`📄 Found ${files.length} agent definition files\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, body } = parseFrontmatter(content);

    const name = data.name || path.basename(filePath, ".md");
    const department = getDepartment(filePath);
    const description = data.description || body.slice(0, 200).trim();
    const role = mapRole(department, name);

    // Skip if already exists
    if (existingNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }

    const payload = {
      name,
      role,
      title: department ? `${department}/${name}` : name,
      adapterType: ADAPTER_TYPE,
      adapterConfig: {
        cwd: "/home/hacker/VibeCoding",
        dangerouslySkipPermissions: true,
        instructionsFilePath: filePath,
      },
      capabilities: description.slice(0, 4000),
      metadata: {
        department: department ?? "general",
        sourceFile: filePath,
        importedAt: new Date().toISOString(),
      },
    };

    if (DRY_RUN) {
      console.log(`  [DRY] Would create: ${name} (${role}, dept: ${department ?? "root"})`);
      created++;
      continue;
    }

    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        created++;
        process.stdout.write(`  ✅ ${name}\n`);
      } else {
        const errBody = await res.text();
        failed++;
        errors.push({ name, error: `HTTP ${res.status}: ${errBody}` });
        process.stdout.write(`  ❌ ${name}: ${res.status}\n`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ name, error: msg });
      process.stdout.write(`  ❌ ${name}: ${msg}\n`);
    }
  }

  // Step 4: Summary
  console.log("\n" + "═".repeat(50));
  console.log("📊 Import Summary");
  console.log("═".repeat(50));
  console.log(`  Created:  ${created}`);
  console.log(`  Skipped:  ${skipped} (already exist)`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${files.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const { name, error } of errors.slice(0, 20)) {
      console.log(`  ${name}: ${error}`);
    }
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more`);
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
