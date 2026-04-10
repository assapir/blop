# Plan: Build `blop` — A Smart AUR Helper CLI

## Context

We've built and published `libalpm` — Node.js bindings for libalpm via napi-rs. Now we want to build a modern AUR helper CLI on top of it that seamlessly handles both official repo packages and AUR packages.

**UX philosophy**: Smart defaults, minimal flags, cautious. Instead of memorizing pacman flags, the user just types `blop <name>` and the tool figures out the right thing to do.

The project will live at `/home/assaf/code/blop/`.

## CLI UX Design

### Smart defaults (no flags needed)

| Command | What it does |
|---------|-------------|
| `blop` | System upgrade — repos + AUR (`-Syu`) |
| `blop <name>` | Smart: if installed → offer remove; if available → offer install; else → search + pick |

### Full pacman flag support

All standard pacman operations are also supported for power users:

| Flag | Operation | Notes |
|------|-----------|-------|
| `-S <pkg>` | Install | Auto-detects repo vs AUR |
| `-Ss <query>` | Search | Searches repos + AUR |
| `-Si <pkg>` | Sync info | Shows repo or AUR info |
| `-Sy` | Refresh DBs | Delegates to `sudo pacman -Sy` |
| `-Syu` | Full upgrade | Repos + AUR |
| `-Q` | List installed | All installed packages |
| `-Qi <pkg>` | Query info | Installed package info |
| `-Qs <query>` | Query search | Search installed packages |
| `-R <pkg>` | Remove | Delegates to pacman |
| `-Rs <pkg>` | Remove + deps | Delegates to pacman |
| `-Rns <pkg>` | Remove + deps + configs | Delegates to pacman |

Any unrecognized flags are passed through to pacman directly.

### Interaction examples

```
$ blop firefox
firefox 138.0-1 is installed (explicit)
  Standalone web browser from mozilla.org
→ Remove? [y/N]

$ blop yay
yay 12.5.7-1 found in AUR (+2547 votes)
  Yet another yogurt. Pacman wrapper and AUR helper written in go.
→ Install? [y/N]

$ blop firef
Searching repos and AUR for "firef"...
 1  extra/firefox 138.0-1
    Standalone web browser from mozilla.org
 2  extra/firefox-developer-edition 139.0b3-1
    Developer Edition of the Firefox web browser
 3  aur/firefox-nightly 142.0a1-1 (+23)
    Nightly build of the Firefox browser
Pick a package [1-3] or q to quit:

$ blop
:: Upgrading official packages...
(runs sudo pacman -Syu)
:: Checking AUR packages...
  yay 12.5.6-1 → 12.5.7-1
→ Upgrade 1 AUR package? [y/N]
```

## Project Structure

```
/home/assaf/code/blop/
  package.json
  tsconfig.json
  LICENSE                      (GPL-3.0-or-later)
  src/
    bin.ts                     (entry point, shebang)
    cli.ts                     (argument parser + dispatcher)
    commands/
      default.ts               (smart default: search/install/remove)
      install.ts               (-S: install packages, repo or AUR)
      search.ts                (-Ss: search repos + AUR)
      upgrade.ts               (-Syu / bare `blop`: system upgrade + AUR)
      info.ts                  (-Si/-Qi: package info)
      query.ts                 (-Q/-Qs: list/search installed)
      remove.ts                (-R/-Rs/-Rns: delegate to pacman)
    services/
      aur-rpc.ts               (AUR RPC v5 client)
      alpm.ts                  (libalpm wrapper + sync DB init)
      pacman-conf.ts           (parse repos via `pacman-conf` CLI)
    core/
      resolver.ts              (dependency resolution + topological sort)
      exec.ts                  (child_process helpers)
      types.ts                 (shared type definitions)
      format.ts                (color output + prompts)
```

## Key Design Decisions

1. **CLI parsing: manual** — Two modes. If first arg starts with `-`, parse pacman-style flags (e.g. `-S`, `-Ss`, `-Syu`, `-Qi`, `-R`). Otherwise: no args → upgrade, bare name → smart default. Unrecognized flags pass through to pacman.

2. **Sync DB init: `pacman-conf` CLI** — Shell out to `pacman-conf --repo-list` and `pacman-conf --repo <name> Server` for resolved repo names/mirrors. Avoids fragile `/etc/pacman.conf` parsing.

3. **Colors: `node:util` styleText** — Use Node's built-in `util.styleText(style, text)` (available since Node 21.7). Supports `'bold'`, `'red'`, `'green'`, `'blue'`, `'cyan'`, `'yellow'`, `'magenta'`, `'dim'`, `'underline'`, etc. Automatically respects `NO_COLOR`, `NODE_DISABLE_COLORS`, and non-TTY. Make the output **vivid** — repo names in bold blue, AUR in bold magenta, versions in bold green, vote counts in yellow, descriptions in dim, prompts in bold cyan, errors in bold red, section headers with colored `::` prefixes, installed status in bright green. The tool should look alive.

4. **Zero runtime deps besides `libalpm`** — Node 25 provides everything we need natively. No build step, no bundler, no transpiler.

5. **`erasableSyntaxOnly: true`** — Required for Node 25 type stripping. No `enum` keyword (use `as const`), no `namespace`, no constructor parameter properties.

6. **Foreign package detection** — Get all local packages, check each against sync DBs via libalpm. No `pacman -Qm` shell-out.

7. **No cache / no SQLite** — A single user won't hit 4000 req/day. Every operation hits the AUR API fresh. No schema management, no TTL logic, no invalidation. Simple.

8. **`blop` with no args = full upgrade** — The most common operation. Just type `blop` and it does `sudo pacman -Syu` + AUR upgrades. No need to remember flags.

9. **DX: oxfmt + oxlint** — `oxfmt` (v0.44.0) for formatting, `oxlint` (v1.59.0) for linting. Both Rust-based, instant, zero-config. Added as devDependencies. Scripts: `pnpm fmt`, `pnpm lint`, `pnpm check` (typecheck + lint).

## Technology Stack

All Node 25 built-ins, zero external dependencies besides `libalpm`:

| Need | Solution | Module |
|------|----------|--------|
| HTTP client (AUR RPC) | Native fetch | global |
| Colored output | `styleText()` | `node:util` |
| Child processes | `spawn`, `execFile` | `node:child_process` |
| File I/O | `readFile`, `mkdir`, `stat` | `node:fs/promises` |
| User prompts | `createInterface` | `node:readline/promises` |
| Path handling | `join`, `homedir` | `node:path`, `node:os` |
| TypeScript | Native type stripping | Node 25 built-in |
| Type checking | `tsgo` (dev only) | `@typescript/native-preview` |
| Formatting | `oxfmt` (dev only) | `oxfmt` |
| Linting | `oxlint` (dev only) | `oxlint` |
| Package DB queries | libalpm bindings | `libalpm` (only runtime dep) |

## Implementation Phases

### Phase 1: Project Skeleton + Core Utilities

1. Create `/home/assaf/code/blop/`, init project
2. **`package.json`** — `"type": "module"`, `"bin": { "blop": "src/bin.ts" }`, dep on `libalpm@^0.1.2`, devDep on `@types/node`
3. **`tsconfig.json`** — `erasableSyntaxOnly`, `verbatimModuleSyntax`, `strict`, `module: "nodenext"`
4. **`src/core/types.ts`** — AUR RPC response types, dependency resolution types
5. **`src/core/format.ts`** — Built on `util.styleText()`. Exports: `formatSearchResult()` (bold blue repo name or bold magenta "aur", bold white pkg name, bold green version, yellow votes/popularity, dim description), `formatPackageInfo()` (labeled fields with colored keys), `confirm()` (bold cyan prompt), `pickNumber()` (bold cyan prompt). Section headers use `::` prefix in bold blue like pacman does. Errors in bold red. Installed markers in bright green.
6. **`src/core/exec.ts`** — `run()` (captured), `runInteractive()` (inherited stdio), `sudoPacman()`, `gitClone()`, `makepkg()`, `findBuiltPackages()`
7. **`src/bin.ts`** — Shebang, imports cli.ts, top-level error boundary
8. **`src/cli.ts`** — No args → `upgrade`. First arg starts with `-` → parse pacman flags and dispatch (`-S`, `-Ss`, `-Si`, `-Syu`, `-Q`, `-Qi`, `-Qs`, `-R`, `-Rs`, `-Rns`). Bare name → `default` command. Unrecognized flags → pass through to `sudo pacman`.

### Phase 2: Service Layer

9. **`src/services/pacman-conf.ts`** — `getRepoList()`, `getRepoServers()`
10. **`src/services/alpm.ts`** — `getAlpmHandle()`, convenience wrappers: `isInstalled()`, `getInstalledPkg()`, `findInRepos()`, `getForeignPackages()`
11. **`src/services/aur-rpc.ts`** — `aurSearch(query)`, `aurInfo(names[])` using native `fetch()`

### Phase 3: Commands

12. **`src/commands/default.ts`** — The smart default UX:
    - Try exact match in local DB → "installed, remove?"
    - Try exact match in sync DBs → "available in repos, install?"
    - Try exact match in AUR → "available in AUR, install?"
    - No exact match → search repos + AUR, show numbered list, let user pick
13. **`src/commands/search.ts`** — `-Ss`: `searchAllSync()` + `aurSearch()`, merged, colored
14. **`src/commands/info.ts`** — `-Si`: sync → AUR. `-Qi`: local DB. Display detailed info
15. **`src/commands/query.ts`** — `-Q`: list all installed. `-Qs`: search installed
16. **`src/commands/remove.ts`** — `-R`/`-Rs`/`-Rns`: delegate to `sudo pacman` with flags

### Phase 4: Dependency Resolution

17. **`src/core/resolver.ts`** —
    - For each target, fetch AUR info
    - For each dep in `Depends` + `MakeDepends`:
      - `findSatisfierLocal(dep)` → skip
      - `findSatisfierSync(dep)` → add to sync list
      - Else → look up in AUR, recurse
    - Topological sort via Kahn's algorithm
    - Cycle detection
    - Returns `InstallPlan { syncPackages: string[], aurPackages: ResolvedPackage[] }`

### Phase 5: Install Flow + Upgrade

18. **`src/commands/install.ts`** + install flow (used by default command and `-S`):
    - Repo packages → `sudo pacman -S --needed`
    - AUR packages → resolve deps → show plan → confirm → install sync deps → for each in topo order: git clone to `~/.cache/blop/<pkgbase>/`, show PKGBUILD, prompt, `makepkg -src`, `sudo pacman -U`
    - Use `PackageBase` for clone dir (handles split packages)

19. **`src/commands/upgrade.ts`** —
    - `sudo pacman -Syu` for repos
    - Get foreign packages → batch AUR info → `vercmp()` to find outdated
    - Show upgrade list → confirm → install flow

## Critical Files & Reuse

- **`libalpm` API** (`/home/assaf/code/alpm-node/index.d.ts`): `AlpmHandle` with `findSatisfierLocal`, `findSatisfierSync`, `searchAllSync`, `getLocalPkg`, `getLocalPkgs`, `registerSyncDb`, `getSyncPkg`; `vercmp()`; `sigLevel()`
- **AUR RPC**: `https://aur.archlinux.org/rpc?v=5` — search (fewer fields), info (full metadata + deps). Batch via `arg[]`.

## Important Edge Cases

- **Root check**: Refuse to run as root. Only `sudo pacman` runs privileged.
- **Split packages**: Use `PackageBase` from AUR RPC for git clone dir
- **PKGBUILD review**: Show diff on update (`git diff`), full content on new install
- **`--needed` flag**: Always pass to `pacman -S` for sync deps
- **makepkg flags**: `-src` = install sync deps, remove makedeps after, clean

## Verification

1. `node src/bin.ts --help` — prints usage
2. `node src/bin.ts` — runs full system upgrade (smart default)
3. `node src/bin.ts firefox` — detects installed, offers to remove
4. `node src/bin.ts yay` — detects in AUR, offers to install
5. `node src/bin.ts firef` — searches, shows numbered results with colors
6. `node src/bin.ts -Ss firefox` — explicit search (pacman flag mode)
7. `node src/bin.ts -Si pacman` — sync package info
8. `node src/bin.ts -Qi pacman` — installed package info
9. `node src/bin.ts -Q` — list installed packages
10. `pnpm lint` — oxlint passes
11. `pnpm fmt` — oxfmt formats
