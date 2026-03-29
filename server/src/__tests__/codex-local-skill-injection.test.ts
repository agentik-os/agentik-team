import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCodexSkillsInjected } from "@agentik-os/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createPaperclipRepoSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "server"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "adapter-utils"), { recursive: true });
  await fs.mkdir(path.join(root, "skills", skillName), { recursive: true });
  await fs.writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
  await fs.writeFile(path.join(root, "package.json"), '{"name":"agentik-team"}\n', "utf8");
  await fs.writeFile(
    path.join(root, "skills", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

async function createCustomSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "custom", skillName), { recursive: true });
  await fs.writeFile(
    path.join(root, "custom", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

describe("codex local adapter skill injection", () => {
  const agentikKey = "agentik-os/agentik-team/agentik";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("repairs a Codex Paperclip skill symlink that still points at another live checkout", async () => {
    const currentRepo = await makeTempDir("agentik-codex-current-");
    const oldRepo = await makeTempDir("agentik-codex-old-");
    const skillsHome = await makeTempDir("agentik-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createPaperclipRepoSkill(currentRepo, "agentik");
    await createPaperclipRepoSkill(oldRepo, "agentik");
    await fs.symlink(path.join(oldRepo, "skills", "agentik"), path.join(skillsHome, "agentik"));

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [{
          key: agentikKey,
          runtimeName: "agentik-team",
          source: path.join(currentRepo, "skills", "agentik"),
        }],
      },
    );

    expect(await fs.realpath(path.join(skillsHome, "agentik"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "agentik")),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Repaired Codex skill "agentik-team"'),
      }),
    );
  });

  it("preserves a custom Codex skill symlink outside Paperclip repo checkouts", async () => {
    const currentRepo = await makeTempDir("agentik-codex-current-");
    const customRoot = await makeTempDir("agentik-codex-custom-");
    const skillsHome = await makeTempDir("agentik-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(customRoot);
    cleanupDirs.add(skillsHome);

    await createPaperclipRepoSkill(currentRepo, "agentik");
    await createCustomSkill(customRoot, "agentik");
    await fs.symlink(path.join(customRoot, "custom", "agentik"), path.join(skillsHome, "agentik"));

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: agentikKey,
        runtimeName: "agentik-team",
        source: path.join(currentRepo, "skills", "agentik"),
      }],
    });

    expect(await fs.realpath(path.join(skillsHome, "agentik"))).toBe(
      await fs.realpath(path.join(customRoot, "custom", "agentik")),
    );
  });

  it("prunes broken symlinks for unavailable Paperclip repo skills before Codex starts", async () => {
    const currentRepo = await makeTempDir("agentik-codex-current-");
    const oldRepo = await makeTempDir("agentik-codex-old-");
    const skillsHome = await makeTempDir("agentik-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createPaperclipRepoSkill(currentRepo, "agentik");
    await createPaperclipRepoSkill(oldRepo, "agent-browser");
    const staleTarget = path.join(oldRepo, "skills", "agent-browser");
    await fs.symlink(staleTarget, path.join(skillsHome, "agent-browser"));
    await fs.rm(staleTarget, { recursive: true, force: true });

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [{
          key: agentikKey,
          runtimeName: "agentik-team",
          source: path.join(currentRepo, "skills", "agentik"),
        }],
      },
    );

    await expect(fs.lstat(path.join(skillsHome, "agent-browser"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Removed stale Codex skill "agent-browser"'),
      }),
    );
  });

  it("preserves other live Paperclip skill symlinks in the shared workspace skill directory", async () => {
    const currentRepo = await makeTempDir("agentik-codex-current-");
    const skillsHome = await makeTempDir("agentik-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(skillsHome);

    await createPaperclipRepoSkill(currentRepo, "agentik");
    await createPaperclipRepoSkill(currentRepo, "agent-browser");
    await fs.symlink(
      path.join(currentRepo, "skills", "agent-browser"),
      path.join(skillsHome, "agent-browser"),
    );

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: agentikKey,
        runtimeName: "agentik-team",
        source: path.join(currentRepo, "skills", "agentik"),
      }],
    });

    expect((await fs.lstat(path.join(skillsHome, "agentik"))).isSymbolicLink()).toBe(true);
    expect((await fs.lstat(path.join(skillsHome, "agent-browser"))).isSymbolicLink()).toBe(true);
    expect(await fs.realpath(path.join(skillsHome, "agent-browser"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "agent-browser")),
    );
  });
});
