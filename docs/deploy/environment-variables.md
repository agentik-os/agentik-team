---
title: Environment Variables
summary: Full environment variable reference
---

All environment variables that Paperclip uses for server configuration.

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Server port |
| `HOST` | `127.0.0.1` | Server host binding |
| `DATABASE_URL` | (embedded) | PostgreSQL connection string |
| `AGENTIK_HOME` | `~/.paperclip` | Base directory for all Paperclip data |
| `AGENTIK_INSTANCE_ID` | `default` | Instance identifier (for multiple local instances) |
| `AGENTIK_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |

## Secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTIK_SECRETS_MASTER_KEY` | (from file) | 32-byte encryption key (base64/hex/raw) |
| `AGENTIK_SECRETS_MASTER_KEY_FILE` | `~/.paperclip/.../secrets/master.key` | Path to key file |
| `AGENTIK_SECRETS_STRICT_MODE` | `false` | Require secret refs for sensitive env vars |

## Agent Runtime (Injected into agent processes)

These are set automatically by the server when invoking agents:

| Variable | Description |
|----------|-------------|
| `AGENTIK_AGENT_ID` | Agent's unique ID |
| `AGENTIK_COMPANY_ID` | Company ID |
| `AGENTIK_API_URL` | Paperclip API base URL |
| `AGENTIK_API_KEY` | Short-lived JWT for API auth |
| `AGENTIK_RUN_ID` | Current heartbeat run ID |
| `AGENTIK_TASK_ID` | Issue that triggered this wake |
| `AGENTIK_WAKE_REASON` | Wake trigger reason |
| `AGENTIK_WAKE_COMMENT_ID` | Comment that triggered this wake |
| `AGENTIK_APPROVAL_ID` | Resolved approval ID |
| `AGENTIK_APPROVAL_STATUS` | Approval decision |
| `AGENTIK_LINKED_ISSUE_IDS` | Comma-separated linked issue IDs |

## LLM Provider Keys (for adapters)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude Local adapter) |
| `OPENAI_API_KEY` | OpenAI API key (for Codex Local adapter) |
