import type { CreateConfigValues } from "@agentik-os/adapter-utils";

export function buildAgentikTmuxConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.model) ac.model = v.model;
  if (v.command) ac.command = v.command;
  ac.dangerouslySkipPermissions = v.dangerouslySkipPermissions ?? true;
  ac.tmuxSessionPrefix = "agentik-run";
  ac.timeoutSec = 600;
  return ac;
}
