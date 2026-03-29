export const type = "agentik_tmux";
export const label = "Agentik Team (tmux)";

export const models = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-haiku-4-6", label: "Claude Haiku 4.6" },
];

export const agentConfigurationDoc = `# agentik_tmux agent configuration

Adapter: agentik_tmux — orchestrates Claude via tmux sessions

Core fields:
- cwd (string, optional): working directory
- model (string, optional): Claude model id
- command (string, optional, default "claude"): CLI command
- dangerouslySkipPermissions (boolean, optional, default true): pass --dangerously-skip-permissions
- tmuxSessionPrefix (string, optional, default "agentik-run"): prefix for tmux session names
- env (object, optional): KEY=VALUE environment variables
- timeoutSec (number, optional): run timeout in seconds
`;
