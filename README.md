# naruto

> **n**ode + **aur** + naru**to** — a smart AUR helper for Arch Linux

[![AUR version](https://img.shields.io/aur/version/naruto-git?label=AUR)](https://aur.archlinux.org/packages/naruto-git)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](/LICENSE)
[![Node ≥ 25](https://img.shields.io/badge/node-%E2%89%A525-brightgreen)](https://nodejs.org)

Just type `naruto`. It does what makes sense.

## Why naruto?

- **Does what makes sense** — `naruto <pkg>` checks if it's installed (offer to remove), in the repos (offer to install), in the AUR (offer to install), or none of the above (search and pick). One command, always the right action.
- **Native libalpm** — queries the package database directly via [libalpm](https://github.com/assapir/libalpm) (napi-rs bindings), no shelling out to `pacman` for reads.
- **Zero runtime dependencies** — besides Node.js itself. No Python, no Go, no Ruby.

## Smart defaults

`naruto <name>` follows a simple, sensible decision tree — no flags needed:

```
naruto <name>
  ├─ already installed?   → show info, ask to remove
  ├─ found in repos?      → show info, ask to install
  ├─ exact match in AUR?  → show info, ask to install
  └─ no exact match?      → search and show a numbered list to pick from

naruto (no args)          → full system upgrade: repos + AUR
```

## Demo

**Already installed — offers to remove:**
```
$ naruto bash
bash 5.3.9-1 is installed
  The GNU Bourne Again shell
→ Remove? 
```

**In the official repos — offers to install:**
```
$ naruto neovim
extra/neovim 0.12.1-1
   Fork of Vim aiming to improve user experience, plugins, and GUIs
→ Install? 
```

**Exact match in the AUR — offers to install:**
```
$ naruto yay
aur/yay 12.5.7-1 (+2552) 48.14
   Yet another yogurt. Pacman wrapper and AUR helper written in go.
→ Install? 
```

**No exact match — searches and lets you pick:**
```
$ naruto firef
==> Searching for "firef"...
1  aur/firefox-nightly 142.0a1-1 (+23) 1.20
    Nightly build of the Firefox browser
2  aur/firefox-developer-edition-bin 139.0b3-1 (+150) 2.30
    Developer Edition of the Firefox browser
3  aur/firetools 0.9.72-3 (+12) 0.05
    Graphical frontend for firejail
Pick a package [1-20] or q to quit: 
```

**No args — full system upgrade:**
```
$ naruto
==> Upgrading official packages...
(runs sudo pacman -Syu)
==> Checking AUR packages...
  yay 12.5.6-1 → 12.5.7-1
→ Upgrade 1 AUR package? 
```

## Installation

Clone from the AUR and build:

```bash
git clone https://aur.archlinux.org/naruto-git.git
cd naruto-git
makepkg -si
```

## Usage

### Smart mode (recommended)

| Command | What it does |
|---------|--------------|
| `naruto` | Full system upgrade — repos + AUR |
| `naruto <name>` | Installed → offer remove · in repos → offer install · exact AUR match → offer install · otherwise → search |

### Pacman flag mode

All standard pacman operations are supported for power users:

| Command | Operation |
|---------|-----------|
| `naruto -S <pkg>` | Install — auto-detects repo vs AUR |
| `naruto -Ss <query>` | Search repos + AUR |
| `naruto -Si <pkg>` | Package info (repo or AUR) |
| `naruto -Sy` | Refresh package databases |
| `naruto -Syu` | Full system upgrade |
| `naruto -Q` | List all installed packages |
| `naruto -Qi <pkg>` | Installed package info |
| `naruto -Qs <query>` | Search installed packages |
| `naruto -R <pkg>` | Remove a package |
| `naruto -Rs <pkg>` | Remove package and its dependencies |
| `naruto -Rns <pkg>` | Remove package, dependencies, and config files |

Any unrecognized flags are passed through to `pacman` directly.

## Requirements

- **Arch Linux** (or an Arch-based distro)
- **Node.js ≥ 25** — uses native TypeScript type stripping, no build step needed
- **`base-devel`** — for building AUR packages (`makepkg`)
- **`git`** — for cloning AUR packages

## How it works

naruto uses [libalpm](https://github.com/assapir/libalpm) — native Node.js bindings for `libalpm`, the library that powers pacman — to query the local and sync package databases directly. The [AUR RPC v5](https://wiki.archlinux.org/title/Aurweb_RPC_interface) API is used for AUR lookups. Dependency resolution is done in-process with batch AUR fetching and a topological sort.

## Development

```bash
git clone https://github.com/assapir/naruto.git
cd naruto
pnpm install
node src/bin.ts        # run directly, no build step
pnpm test              # run tests (node:test)
pnpm check             # typecheck (tsgo) + lint (oxlint)
pnpm fmt               # format (oxfmt)
```

Contributions are welcome! Please open an issue before submitting a large PR.

## License

[GPL-3.0-or-later](/LICENSE)
