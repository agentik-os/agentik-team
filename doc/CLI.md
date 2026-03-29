# CLI Reference

Paperclip CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm agentik-team --help
```

First-time local bootstrap + run:

```sh
pnpm agentik-team run
```

Choose local instance:

```sh
pnpm agentik-team run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `agentik-team onboard` and `agentik-team configure --section server` set deployment mode in config
- runtime can override mode with `AGENTIK_DEPLOYMENT_MODE`
- `agentik-team run` and `agentik-team doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm agentik-team allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.paperclip`:

```sh
pnpm agentik-team run --data-dir ./tmp/paperclip-dev
pnpm agentik-team issue list --data-dir ./tmp/paperclip-dev
```

## Context Profiles

Store local defaults in `~/.paperclip/context.json`:

```sh
pnpm agentik-team context set --api-base http://localhost:3100 --company-id <company-id>
pnpm agentik-team context show
pnpm agentik-team context list
pnpm agentik-team context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm agentik-team context set --api-key-env-var-name AGENTIK_API_KEY
export AGENTIK_API_KEY=...
```

## Company Commands

```sh
pnpm agentik-team company list
pnpm agentik-team company get <company-id>
pnpm agentik-team company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm agentik-team company delete PAP --yes --confirm PAP
pnpm agentik-team company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `AGENTIK_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `AGENTIK_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm agentik-team issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm agentik-team issue get <issue-id-or-identifier>
pnpm agentik-team issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm agentik-team issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm agentik-team issue comment <issue-id> --body "..." [--reopen]
pnpm agentik-team issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm agentik-team issue release <issue-id>
```

## Agent Commands

```sh
pnpm agentik-team agent list --company-id <company-id>
pnpm agentik-team agent get <agent-id>
pnpm agentik-team agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Paperclip agent:

- creates a new long-lived agent API key
- installs missing Paperclip skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `AGENTIK_API_URL`, `AGENTIK_COMPANY_ID`, `AGENTIK_AGENT_ID`, and `AGENTIK_API_KEY`

Example for shortname-based local setup:

```sh
pnpm agentik-team agent local-cli codexcoder --company-id <company-id>
pnpm agentik-team agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm agentik-team approval list --company-id <company-id> [--status pending]
pnpm agentik-team approval get <approval-id>
pnpm agentik-team approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm agentik-team approval approve <approval-id> [--decision-note "..."]
pnpm agentik-team approval reject <approval-id> [--decision-note "..."]
pnpm agentik-team approval request-revision <approval-id> [--decision-note "..."]
pnpm agentik-team approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm agentik-team approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm agentik-team activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm agentik-team dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm agentik-team heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.paperclip/instances/default`:

- config: `~/.paperclip/instances/default/config.json`
- embedded db: `~/.paperclip/instances/default/db`
- logs: `~/.paperclip/instances/default/logs`
- storage: `~/.paperclip/instances/default/data/storage`
- secrets key: `~/.paperclip/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
AGENTIK_HOME=/custom/home AGENTIK_INSTANCE_ID=dev pnpm agentik-team run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm agentik-team configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
