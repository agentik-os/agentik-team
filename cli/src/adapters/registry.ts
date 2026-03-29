import type { CLIAdapterModule } from "@agentik-os/adapter-utils";
import { printClaudeStreamEvent } from "@agentik-os/adapter-claude-local/cli";
import { printCodexStreamEvent } from "@agentik-os/adapter-codex-local/cli";
import { printCursorStreamEvent } from "@agentik-os/adapter-cursor-local/cli";
import { printGeminiStreamEvent } from "@agentik-os/adapter-gemini-local/cli";
import { printOpenCodeStreamEvent } from "@agentik-os/adapter-opencode-local/cli";
import { printPiStreamEvent } from "@agentik-os/adapter-pi-local/cli";
import { printOpenClawGatewayStreamEvent } from "@agentik-os/adapter-openclaw-gateway/cli";
import { printAgentikTmuxStreamEvent } from "@agentik-os/adapter-agentik-tmux/cli";
import { processCLIAdapter } from "./process/index.js";
import { httpCLIAdapter } from "./http/index.js";

const claudeLocalCLIAdapter: CLIAdapterModule = {
  type: "claude_local",
  formatStdoutEvent: printClaudeStreamEvent,
};

const codexLocalCLIAdapter: CLIAdapterModule = {
  type: "codex_local",
  formatStdoutEvent: printCodexStreamEvent,
};

const openCodeLocalCLIAdapter: CLIAdapterModule = {
  type: "opencode_local",
  formatStdoutEvent: printOpenCodeStreamEvent,
};

const piLocalCLIAdapter: CLIAdapterModule = {
  type: "pi_local",
  formatStdoutEvent: printPiStreamEvent,
};

const cursorLocalCLIAdapter: CLIAdapterModule = {
  type: "cursor",
  formatStdoutEvent: printCursorStreamEvent,
};

const geminiLocalCLIAdapter: CLIAdapterModule = {
  type: "gemini_local",
  formatStdoutEvent: printGeminiStreamEvent,
};

const openclawGatewayCLIAdapter: CLIAdapterModule = {
  type: "openclaw_gateway",
  formatStdoutEvent: printOpenClawGatewayStreamEvent,
};

const agentikTmuxCLIAdapter: CLIAdapterModule = {
  type: "agentik_tmux",
  formatStdoutEvent: printAgentikTmuxStreamEvent,
};

const adaptersByType = new Map<string, CLIAdapterModule>(
  [
    claudeLocalCLIAdapter,
    codexLocalCLIAdapter,
    openCodeLocalCLIAdapter,
    piLocalCLIAdapter,
    cursorLocalCLIAdapter,
    geminiLocalCLIAdapter,
    openclawGatewayCLIAdapter,
    agentikTmuxCLIAdapter,
    processCLIAdapter,
    httpCLIAdapter,
  ].map((a) => [a.type, a]),
);

export function getCLIAdapter(type: string): CLIAdapterModule {
  return adaptersByType.get(type) ?? processCLIAdapter;
}
