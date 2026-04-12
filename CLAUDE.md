# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is naruto

A smart AUR helper CLI for Arch Linux (**n**ode + **aur** + naru**to**). Zero runtime dependencies besides `libalpm` (Node.js napi-rs bindings for the Arch Linux package manager). Runs on Node 25+ with native TypeScript type stripping — no build step, no bundler, no transpiler.

## Commands

```bash
pnpm test              # Run tests (node:test runner)
pnpm test -- --test-name-pattern="parseCommand"  # Run specific test by name
pnpm fmt               # Format with oxfmt
pnpm lint              # Lint with oxlint
pnpm check             # Typecheck (tsgo) + lint
node src/bin.ts        # Run the CLI directly
```

## Architecture

```
bin.ts → cli.ts → commands/* → services/* → core/*
                                               ↓
                                           libalpm (napi-rs)
```

- **`src/bin.ts`** — Entry point with shebang and top-level error boundary (uses top-level await)
- **`src/cli.ts`** — `parseCommand(argv)` returns a `Command` discriminated union, `dispatch()` routes it. Uses `node:util parseArgs()` with short flags (`-S`, `-Q`, `-R`, `-s`, `-i`, `-y`, `-u`, `-n`) and long names (`--sync`, `--query`, `--remove`, `--search`, `--info`, `--refresh`, `--upgrades`, `--nosave`). Unknown flags pass through to pacman.
- **`src/contracts/`** — Service type contracts (Alpm, Aur, Exec, Ui, Services)
- **`src/core/`** — Types, formatting (styleText), child process helpers, dependency resolver
- **`src/services/`** — AlpmService, AurService, PacmanConfService + composition root
- **`src/commands/`** — One module per operation (install, search, upgrade, info, query, remove, default)

## Key constraints

- **`erasableSyntaxOnly: true`** — No `enum` keyword (use `as const`), no `namespace`, no constructor parameter properties. Required for Node 25 native type stripping.
- **`verbatimModuleSyntax: true`** — Use `import type` for type-only imports.
- **Zero external runtime deps** — Only `libalpm`. Use `node:util styleText()` for colors, `node:readline/promises` for prompts, native `fetch()` for HTTP, `node:child_process` for processes.
- **ESM only** — `"type": "module"` in package.json. All imports use `.ts` extensions.
- **Vivid colors** — repo names bold blue, AUR bold magenta, versions bold green, votes yellow, descriptions dim, prompts bold cyan, errors bold red, section headers with `::` in bold blue. Uses `styleText()` which respects `NO_COLOR` automatically.
- **DI pattern** — See `DESIGN.md`. Classes with constructor injection, service contracts in `src/contracts/`, fakes in `test/fakes/`.

## Implementation status

See `PLAN.md` for the full design. All phases (1-5) are complete: skeleton, services, commands, resolver, install flow. See `DESIGN.md` for the DI architecture.
