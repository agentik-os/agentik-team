import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@agentik-os/adapter-utils";
import { asString, parseObject } from "@agentik-os/adapter-utils/server-utils";
import { execSync } from "node:child_process";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((c) => c.level === "error")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "pass";
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { encoding: "utf-8", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const command = asString(config.command, "claude");

  if (commandExists("tmux")) {
    checks.push({
      code: "agentik_tmux_installed",
      level: "info",
      message: "tmux is installed and available on PATH.",
    });
  } else {
    checks.push({
      code: "agentik_tmux_missing",
      level: "error",
      message: "tmux is not installed. Install it with: apt install tmux",
    });
  }

  if (commandExists(command)) {
    checks.push({
      code: "agentik_tmux_claude_installed",
      level: "info",
      message: `CLI command is available: ${command}`,
    });
  } else {
    checks.push({
      code: "agentik_tmux_claude_missing",
      level: "error",
      message: `CLI command "${command}" is not available on PATH.`,
    });
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
