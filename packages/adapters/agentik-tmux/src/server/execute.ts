import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@agentik-os/adapter-utils";
import {
  asString,
  asBoolean,
  asNumber,
  parseObject,
  joinPromptSections,
  renderTemplate,
} from "@agentik-os/adapter-utils/server-utils";
import { parseAgentikTmuxStreamJson } from "./parse.js";

function tmux(...args: string[]): string {
  return execSync(`tmux ${args.join(" ")}`, { encoding: "utf-8", timeout: 10_000 }).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, context, onLog } = ctx;
  const config = parseObject(ctx.config);
  const command = asString(config.command, "claude");
  const cwd = asString(config.cwd, process.cwd());
  const model = asString(config.model, "");
  const dangerouslySkip = asBoolean(config.dangerouslySkipPermissions, true);
  const prefix = asString(config.tmuxSessionPrefix, "agentik-run");
  const timeoutSec = asNumber(config.timeoutSec, 600);
  const sessionName = `${prefix}-${runId.slice(0, 8)}`;

  const startTime = Date.now();
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = 0;
  let timedOut = false;

  try {
    const cliArgs = [command, "--print", "-", "--output-format", "stream-json", "--verbose"];
    if (dangerouslySkip) cliArgs.push("--dangerously-skip-permissions");
    if (model) cliArgs.push("--model", model);

    const envConfig = parseObject(config.env);
    const envParts: string[] = [];
    for (const [key, value] of Object.entries(envConfig)) {
      if (typeof value === "string") envParts.push(`${key}=${value}`);
    }

    // Build prompt from context
    const promptTemplate = asString(config.promptTemplate, "{{context.paperclipPrompt}}");
    const templateData = {
      agentId: agent.id,
      companyId: agent.companyId,
      runId,
      company: { id: agent.companyId },
      agent,
      run: { id: runId, source: "on_demand" },
      context,
    };
    const renderedPrompt = renderTemplate(promptTemplate, templateData);
    const prompt = joinPromptSections([renderedPrompt]);
    const promptFile = path.join(os.tmpdir(), `agentik-prompt-${runId}.txt`);
    fs.writeFileSync(promptFile, prompt);

    const envPrefix = envParts.length > 0 ? `${envParts.join(" ")} ` : "";
    const shellCmd = `cd ${JSON.stringify(cwd)} && ${envPrefix}cat ${JSON.stringify(promptFile)} | ${cliArgs.join(" ")}; echo "___AGENTIK_EXIT_$?___"`;
    tmux("new-session", "-d", "-s", sessionName, "-x", "250", "-y", "50", JSON.stringify(`bash -c ${JSON.stringify(shellCmd)}`));

    const deadline = Date.now() + timeoutSec * 1000;
    let output = "";
    let completed = false;

    while (Date.now() < deadline) {
      await sleep(2000);
      try {
        output = tmux("capture-pane", "-t", sessionName, "-p", "-S", "-10000");
      } catch {
        completed = true;
        break;
      }

      const exitMatch = output.match(/___AGENTIK_EXIT_(\d+)___/);
      if (exitMatch) {
        exitCode = parseInt(exitMatch[1], 10);
        completed = true;
        break;
      }
    }

    stdout = output.replace(/___AGENTIK_EXIT_\d+___/, "").trim();

    if (!completed) {
      exitCode = 124;
      timedOut = true;
      stderr = `Execution timed out after ${timeoutSec}s`;
    }

    try {
      tmux("kill-session", "-t", sessionName);
    } catch {
      /* session may already be gone */
    }
    try {
      fs.unlinkSync(promptFile);
    } catch {
      /* best effort */
    }
  } catch (err) {
    exitCode = 1;
    stderr = err instanceof Error ? err.message : String(err);
  }

  const parsed = parseAgentikTmuxStreamJson(stdout);

  return {
    exitCode,
    signal: null,
    timedOut,
    usage: parsed.usage ?? undefined,
    summary: parsed.summary || stdout.slice(-2000),
    sessionId: parsed.sessionId,
    model: parsed.model || model || undefined,
  };
}
