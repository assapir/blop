# Contributing to naruto

Thanks for your interest! Here's everything you need to get started.

## Prerequisites

- **Arch Linux** (or Arch-based) — the test suite runs against the real package database
- **Node.js ≥ 25** — native TypeScript type stripping, no build step
- **pnpm** — `npm install -g pnpm`

## Setup

```bash
git clone https://github.com/assapir/naruto.git
cd naruto
pnpm install
node src/bin.ts --help   # verify it runs
```

## Development workflow

```bash
pnpm test       # run all tests (node:test)
pnpm check      # typecheck (tsgo) + lint (oxlint)
pnpm fmt        # auto-format (oxfmt)
```

Run a specific test by name:

```bash
pnpm test -- --test-name-pattern="parseCommand"
```

## Project structure

```
src/
  bin.ts              entry point + top-level error boundary
  cli.ts              argument parser (parseCommand) + dispatcher
  commands/           one module per operation
  services/           real service implementations
  contracts/          service type contracts (interfaces)
  core/               shared utilities (types, formatting, exec, resolver)
test/
  *.test.ts           test files (node:test)
  fakes/              in-memory service fakes for command tests
```

## Architecture & DI

naruto uses constructor injection throughout. Commands depend only on abstract
contracts (`Alpm`, `Aur`, `Exec`, `Ui`, `Output`) defined in `src/contracts/services.ts`,
not on concrete implementations. This keeps commands fully testable without a
real system.

**Adding a new command:**
1. Add a new `Command` variant to the discriminated union in `src/cli.ts`
2. Implement it in `src/commands/your-command.ts` — accept only the service contracts it needs
3. Route it in `dispatch()` in `src/cli.ts`
4. Test it using `createFakeServices()` from `test/fakes/services.ts`

## Testing strategy

| Test file | What it tests |
|-----------|---------------|
| `AlpmService.test.ts` | Real libalpm queries against the local system |
| `AurService.test.ts` | AUR RPC v5 HTTP calls |
| `cli.test.ts` | `parseCommand()` — pure, no I/O |
| `commands.test.ts` | Command logic via fakes |
| `dispatch.test.ts` | Routing via fakes |
| `resolver.test.ts` | Dependency resolution via fakes |
| `format.test.ts` | Output formatting |

Service tests (`AlpmService`, `AurService`, `PacmanConfService`) hit real system
state — they require a working Arch install with `pacman` and network access.
Command tests use fakes and are fully hermetic.

## Key constraints

- **`erasableSyntaxOnly: true`** — no `enum` (use `as const`), no `namespace`, no constructor parameter properties. Required for Node 25 native type stripping.
- **`verbatimModuleSyntax: true`** — use `import type` for type-only imports.
- **Zero new runtime dependencies** — Node 25 builtins cover everything. The only allowed runtime dep is `libalpm`.
- **ESM only** — all imports use `.ts` extensions.

## Submitting a PR

- Open an issue first for anything non-trivial
- Keep PRs focused — one thing at a time
- Make sure `pnpm check` and `pnpm test` pass before pushing
