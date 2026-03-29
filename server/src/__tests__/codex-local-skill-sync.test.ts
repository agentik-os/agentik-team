import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listCodexSkills,
  syncCodexSkills,
} from "@agentik-os/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("codex local skill sync", () => {
  const agentikKey = "agentik-os/agentik-team/agentik";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("reports configured Paperclip skills for workspace injection on the next run", async () => {
    const codexHome = await makeTempDir("agentik-codex-skill-sync-");
    cleanupDirs.add(codexHome);

    const ctx = {
      agentId: "agent-1",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        paperclipSkillSync: {
          desiredSkills: [agentikKey],
        },
      },
    } as const;

    const before = await listCodexSkills(ctx);
    expect(before.mode).toBe("ephemeral");
    expect(before.desiredSkills).toContain(agentikKey);
    expect(before.entries.find((entry) => entry.key === agentikKey)?.required).toBe(true);
    expect(before.entries.find((entry) => entry.key === agentikKey)?.state).toBe("configured");
    expect(before.entries.find((entry) => entry.key === agentikKey)?.detail).toContain("CODEX_HOME/skills/");
  });

  it("does not persist Paperclip skills into CODEX_HOME during sync", async () => {
    const codexHome = await makeTempDir("agentik-codex-skill-prune-");
    cleanupDirs.add(codexHome);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        paperclipSkillSync: {
          desiredSkills: [agentikKey],
        },
      },
    } as const;

    const after = await syncCodexSkills(configuredCtx, [agentikKey]);
    expect(after.mode).toBe("ephemeral");
    expect(after.entries.find((entry) => entry.key === agentikKey)?.state).toBe("configured");
    await expect(fs.lstat(path.join(codexHome, "skills", "agentik"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps required bundled Paperclip skills configured even when the desired set is emptied", async () => {
    const codexHome = await makeTempDir("agentik-codex-skill-required-");
    cleanupDirs.add(codexHome);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        paperclipSkillSync: {
          desiredSkills: [],
        },
      },
    } as const;

    const after = await syncCodexSkills(configuredCtx, []);
    expect(after.desiredSkills).toContain(agentikKey);
    expect(after.entries.find((entry) => entry.key === agentikKey)?.state).toBe("configured");
  });

  it("normalizes legacy flat Paperclip skill refs before reporting configured state", async () => {
    const codexHome = await makeTempDir("agentik-codex-legacy-skill-sync-");
    cleanupDirs.add(codexHome);

    const snapshot = await listCodexSkills({
      agentId: "agent-3",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        paperclipSkillSync: {
          desiredSkills: ["agentik-team"],
        },
      },
    });

    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.desiredSkills).toContain(agentikKey);
    expect(snapshot.desiredSkills).not.toContain("agentik-team");
    expect(snapshot.entries.find((entry) => entry.key === agentikKey)?.state).toBe("configured");
    expect(snapshot.entries.find((entry) => entry.key === "agentik-team")).toBeUndefined();
  });
});
