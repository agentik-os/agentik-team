import fs from "node:fs";
import path from "node:path";
import { resolveDefaultConfigPath } from "./home-paths.js";

const AGENTIK_CONFIG_BASENAME = "config.json";
const AGENTIK_ENV_FILENAME = ".env";

function findConfigFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    const candidate = path.resolve(currentDir, ".agentik-team", AGENTIK_CONFIG_BASENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolveAgentikConfigPath(overridePath?: string): string {
  if (overridePath) return path.resolve(overridePath);
  if (process.env.AGENTIK_CONFIG) return path.resolve(process.env.AGENTIK_CONFIG);
  return findConfigFileFromAncestors(process.cwd()) ?? resolveDefaultConfigPath();
}

export function resolveAgentikEnvPath(overrideConfigPath?: string): string {
  return path.resolve(path.dirname(resolveAgentikConfigPath(overrideConfigPath)), AGENTIK_ENV_FILENAME);
}
