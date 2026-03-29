import type { UIAdapterModule } from "../types";
import { parseAgentikTmuxStdoutLine } from "@agentik-os/adapter-agentik-tmux/ui";
import { AgentikTmuxConfigFields } from "./config-fields";
import { buildAgentikTmuxConfig } from "@agentik-os/adapter-agentik-tmux/ui";

export const agentikTmuxUIAdapter: UIAdapterModule = {
  type: "agentik_tmux",
  label: "Agentik Team (tmux)",
  parseStdoutLine: parseAgentikTmuxStdoutLine,
  ConfigFields: AgentikTmuxConfigFields,
  buildAdapterConfig: buildAgentikTmuxConfig,
};
