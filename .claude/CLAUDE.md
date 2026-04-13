# Agentik Team (Paperclip Fork)

> Control plane for AI-agent companies. Manages agents as employees with org charts, task assignment, budgets, and knowledge bases.

## Architecture

```
Agentik-Team/
├── server/          # Express REST API + orchestration
├── ui/              # React + Vite board UI
├── packages/
│   ├── db/          # Drizzle schema, migrations, PGlite
│   ├── shared/      # Types, constants, validators
│   ├── adapters/    # Agent adapters (Claude, Codex, Cursor, etc.)
│   ├── adapter-utils/
│   └── plugins/     # Plugin system
├── cli/             # CLI interface
├── doc/             # Product & engineering docs
└── evals/           # Evaluation suite
```

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express, TypeScript |
| Frontend | React + Vite |
| Database | Drizzle ORM + PGlite (dev) / PostgreSQL (prod) |
| Package Manager | pnpm (monorepo) |
| Adapters | Claude, Codex, Cursor, Droid, Hermes |

## Development

```bash
pnpm install
pnpm dev              # API + UI on http://localhost:3100
pnpm -r typecheck     # Type check all packages
pnpm test:run         # Run tests
pnpm build            # Production build
```

Dev uses embedded PGlite (no DATABASE_URL needed). Reset: `rm -rf data/pglite && pnpm dev`

## Key Docs

Read in order: `doc/GOAL.md` → `doc/PRODUCT.md` → `doc/SPEC-implementation.md` → `doc/DEVELOPING.md` → `doc/DATABASE.md`

## Git

- **Account:** agentik-os
- **Email:** x@agentik-os.com
- **Repo:** agentik-os/Agentik-Team

## Verification

Before claiming done: `pnpm -r typecheck && pnpm test:run && pnpm build`
