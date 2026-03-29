import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  AdapterSkillContext,
  AdapterSkillEntry,
  AdapterSkillSnapshot,
} from "@agentik-os/adapter-utils";

async function readSkillsFromDir(dir: string): Promise<AdapterSkillEntry[]> {
  const entries: AdapterSkillEntry[] = [];
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (!item.isDirectory()) continue;
      const skillMd = path.join(dir, item.name, "SKILL.md");
      try {
        await fs.access(skillMd);
        entries.push({
          key: item.name,
          runtimeName: item.name,
          desired: true,
          managed: false,
          state: "configured",
          origin: "user_installed",
          originLabel: "Local ~/.claude/commands/",
          readOnly: true,
          sourcePath: path.join(dir, item.name),
          targetPath: undefined,
          detail: null,
        });
      } catch {
        /* no SKILL.md — skip */
      }
    }
  } catch {
    /* directory doesn't exist — return empty */
  }
  return entries;
}

export async function listAgentikTmuxSkills(
  ctx: AdapterSkillContext,
): Promise<AdapterSkillSnapshot> {
  const home = os.homedir();
  const commandsDir = path.join(home, ".claude", "commands");
  const entries = await readSkillsFromDir(commandsDir);

  return {
    adapterType: "agentik_tmux",
    supported: true,
    mode: "persistent",
    desiredSkills: entries.map((e) => e.key),
    entries,
    warnings: [],
  };
}

export async function syncAgentikTmuxSkills(
  ctx: AdapterSkillContext,
  _desiredSkills: string[],
): Promise<AdapterSkillSnapshot> {
  return listAgentikTmuxSkills(ctx);
}
