# Copilot instructions for naruto

## Build, test, and lint

- There is no build step. This project runs directly on Node 25+ using native TypeScript type stripping.
- Run the CLI locally with `node src/bin.ts`.
- Run all tests with `pnpm test`.
- Run a single test by name with `pnpm test -- --test-name-pattern="parseCommand"`.
- Run a single test file with `node --test test/cli.test.ts`.
- Format with `pnpm fmt`.
- Lint with `pnpm lint`.
- Run typecheck + lint with `pnpm check`.
- End-to-end coverage lives in `test/e2e.sh`; CI runs it in an Arch container.

## High-level architecture

- See [DESIGN.md](../DESIGN.md) for the fuller DI and composition-root architecture.
- Entry flow is `src/bin.ts -> parseCommand()` in `src/cli.ts` -> `createServices()` -> `dispatch()`. `help` and parse errors are handled before service initialization.
- `parseCommand()` is pure and returns a discriminated `Command` union. Bare `naruto` means full upgrade, bare package names use the smart default flow, and unknown pacman-style flags are passed through to pacman.
- `src/contracts/services.ts` defines the dependency boundaries. Commands do not call concrete implementations directly; they receive only the contracts they need (`Alpm`, `Aur`, `Exec`, `Ui`, `Output`), preferably via small named deps objects.
- `src/services/create.ts` is the composition root. It wires `PacmanConfService` into `AlpmService.create()`, creates `AurService`, and exposes exec/ui helpers as plain function objects.
- `AlpmService` is the local/sync package database boundary over `libalpm`. `AurService` is the AUR RPC client and batches `info()` requests in groups of 200.
- AUR installs and upgrades converge in `src/commands/install.ts` and `src/commands/upgrade.ts`, with dependency planning in `src/core/resolver.ts`. The resolver separates sync dependencies from AUR packages and topologically sorts AUR builds before `makepkg` and `pacman -U`.
- Tests are DI-driven: `test/fakes/` contains one fake per service contract, and command tests wire those fakes together instead of mocking internals.

## Key conventions

- Keep the project compatible with Node 25 native type stripping: ESM only, `.ts` import specifiers, `import type` for type-only imports, and no syntax blocked by `erasableSyntaxOnly` (`enum`, `namespace`, constructor parameter properties).
- Prefer built-in Node APIs over new runtime dependencies. The only runtime dependency should remain `libalpm`; use native `fetch`, `node:readline/promises`, `node:util styleText()`, and `node:child_process` elsewhere.
- Reuse formatting helpers from `src/core/format.ts` instead of inline ANSI or ad hoc console output. The CLI has an intentional color vocabulary: repo results are bright cyan, AUR is bright magenta, versions are bright green, prompts are bold cyan, errors are bold red, and section headers use a blue `::` prefix.
- Preserve the narrow-DI command shape: command modules should accept only the services they need, not the whole `Services` bundle, even though `dispatch()` destructures from the full bundle.
- For tests, extend the fakes in `test/fakes/` and use them through `createFakeServices()` or equivalent wiring instead of introducing broader integration scaffolding.
- `install()` treats repo and AUR targets differently: repo packages go straight to `sudo pacman -S --needed`, while AUR packages resolve dependencies, show the build plan, display the `PKGBUILD`, build with `makepkg -src`, and install via `pacman -U`.
- `src/core/resolver.ts` currently does not support virtual `Provides` resolution for AUR dependencies. Keep that limitation in mind before assuming provider-based dependency resolution already exists.
