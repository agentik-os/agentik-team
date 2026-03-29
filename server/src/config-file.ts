import fs from "node:fs";
import { agentikConfigSchema, type AgentikConfig } from "@agentik-os/shared";
import { resolveAgentikConfigPath } from "./paths.js";

export function readConfigFile(): AgentikConfig | null {
  const configPath = resolveAgentikConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return agentikConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
