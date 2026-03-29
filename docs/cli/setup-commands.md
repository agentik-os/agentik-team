---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `agentik-team run`

One-command bootstrap and start:

```sh
pnpm agentik-team run
```

Does:

1. Auto-onboards if config is missing
2. Runs `agentik-team doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm agentik-team run --instance dev
```

## `agentik-team onboard`

Interactive first-time setup:

```sh
pnpm agentik-team onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm agentik-team onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm agentik-team onboard --yes
```

## `agentik-team doctor`

Health checks with optional auto-repair:

```sh
pnpm agentik-team doctor
pnpm agentik-team doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `agentik-team configure`

Update configuration sections:

```sh
pnpm agentik-team configure --section server
pnpm agentik-team configure --section secrets
pnpm agentik-team configure --section storage
```

## `agentik-team env`

Show resolved environment configuration:

```sh
pnpm agentik-team env
```

## `agentik-team allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm agentik-team allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.paperclip/instances/default/config.json` |
| Database | `~/.paperclip/instances/default/db` |
| Logs | `~/.paperclip/instances/default/logs` |
| Storage | `~/.paperclip/instances/default/data/storage` |
| Secrets key | `~/.paperclip/instances/default/secrets/master.key` |

Override with:

```sh
AGENTIK_HOME=/custom/home AGENTIK_INSTANCE_ID=dev pnpm agentik-team run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm agentik-team run --data-dir ./tmp/paperclip-dev
pnpm agentik-team doctor --data-dir ./tmp/paperclip-dev
```
