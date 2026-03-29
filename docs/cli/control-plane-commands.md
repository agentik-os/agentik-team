---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm agentik-team issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm agentik-team issue get <issue-id-or-identifier>

# Create issue
pnpm agentik-team issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm agentik-team issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm agentik-team issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm agentik-team issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm agentik-team issue release <issue-id>
```

## Company Commands

```sh
pnpm agentik-team company list
pnpm agentik-team company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm agentik-team company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm agentik-team company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Apply import
pnpm agentik-team company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm agentik-team agent list
pnpm agentik-team agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm agentik-team approval list [--status pending]

# Get approval
pnpm agentik-team approval get <approval-id>

# Create approval
pnpm agentik-team approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm agentik-team approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm agentik-team approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm agentik-team approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm agentik-team approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm agentik-team approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm agentik-team activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm agentik-team dashboard get
```

## Heartbeat

```sh
pnpm agentik-team heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
