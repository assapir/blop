# Architecture & DI Design

## DI Pattern

Classes with constructor injection. No frameworks — just classes, types, and a composition root.

### Contracts

Service interfaces live in `src/contracts/services.ts`. They define what commands can depend on, decoupled from implementations.

| Contract | Purpose |
|----------|---------|
| `Alpm` | Package database queries (local + sync), version comparison |
| `Aur` | AUR RPC search and info |
| `Exec` | Shell commands (pacman, git, makepkg) |
| `Ui` | User interaction (confirm, pick number) |
| `PacmanConf` | Repo list + mirror URLs (internal, used only by `AlpmService` init) |
| `Services` | Bundle of `Alpm + Aur + Exec + Ui` passed through dispatch |

### Implementations

Service classes live in `src/services/`, named to match their file:

| File | Class | Contract |
|------|-------|----------|
| `AlpmService.ts` | `AlpmService` | `Alpm` |
| `AurService.ts` | `AurService` | `Aur` |
| `PacmanConfService.ts` | `PacmanConfService` | `PacmanConf` |

`Exec` and `Ui` are plain objects of functions (no class needed — stateless).

### Composition Root

`src/services/create.ts` exports `createServices()` which wires real implementations:

```
PacmanConfService(run)  →  AlpmService.create(pacmanConf)  →  Services
AurService()            →
exec functions          →
ui functions            →
```

### Fakes

Test doubles live in `test/fakes/`, one per contract:

| File | Class | For testing |
|------|-------|-------------|
| `FakeAlpmService.ts` | `FakeAlpmService` | In-memory local + sync package maps |
| `FakeAurService.ts` | `FakeAurService` | In-memory AUR package list |
| `FakePacmanConfService.ts` | `FakePacmanConfService` | Hardcoded repos |
| `FakeExecService.ts` | `FakeExecService` | Records calls, returns success |
| `FakeUiService.ts` | `FakeUiService` | Pre-programmed answers |
| `services.ts` | `createFakeServices()` | Wires all fakes together |

## App Lifecycle

```
bin.ts
  ├─ parseCommand(argv)           pure, no side effects
  ├─ help/error?  →  handle immediately, no services needed
  └─ else  →  createServices()  →  dispatch(cmd, services)
                                      └─ destructures {alpm, aur, exec, ui}
                                      └─ calls command with only the deps it needs
```

## Command Signatures

Each command takes only the services it actually uses:

```
search(query, alpm, aur)
syncInfo(name, alpm, aur)
queryInfo(name, alpm)
query(alpm)
querySearch(query, alpm)
install(packages, alpm, aur, exec, ui)
upgrade(alpm, aur, exec, ui)
defaultCommand(names, alpm, aur, exec, ui)
```

## Testing Strategy

- **Service tests**: Integration tests against real system (libalpm, pacman-conf) + fake fetch for AUR
- **Command tests** (future): Use `createFakeServices()` to test full command flows without system access
- **Pure function tests**: Direct tests for `parseCommand`, format functions
