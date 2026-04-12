import { parseArgs } from "node:util";
import { search } from "./commands/search.ts";
import { syncInfo, queryInfo } from "./commands/info.ts";
import { query, querySearch } from "./commands/query.ts";
import { install } from "./commands/install.ts";
import { upgrade } from "./commands/upgrade.ts";
import { defaultCommand } from "./commands/default.ts";
import type { Services } from "./contracts/services.ts";

const OPERATIONS = [
  ["-S, --sync <pkg>", "Install package (repo or AUR)"],
  ["-Ss, --sync --search", "Search repos + AUR"],
  ["-Si, --sync --info", "Show sync package info"],
  ["-Syu", "Full system upgrade"],
  ["-Sy, --sync --refresh", "Refresh package databases"],
  ["-Q, --query", "List installed packages"],
  ["-Qs, --query --search", "Search installed packages"],
  ["-Qi, --query --info", "Show installed package info"],
  ["-R, --remove <pkg>", "Remove package"],
  ["-Rs", "Remove package + orphan deps"],
  ["-Rns", "Remove package + deps + configs"],
  ["--help", "Show this help"],
] as const;

function buildUsage(): string {
  const pad = Math.max(...OPERATIONS.map(([flags]) => flags.length)) + 2;
  const ops = OPERATIONS.map(([flags, desc]) => `  ${flags.padEnd(pad)}${desc}`).join("\n");
  return `Usage: naruto [operation] [package(s)]

Smart defaults:
  naruto                  System upgrade (repos + AUR)
  naruto <name>           Smart: install, remove, or search

Operations:
${ops}`;
}

export const USAGE = buildUsage();

const PARSE_OPTIONS = {
  sync: { type: "boolean", short: "S" },
  query: { type: "boolean", short: "Q" },
  remove: { type: "boolean", short: "R" },
  search: { type: "boolean", short: "s" },
  info: { type: "boolean", short: "i" },
  refresh: { type: "boolean", short: "y" },
  upgrades: { type: "boolean", short: "u" },
  nosave: { type: "boolean", short: "n" },
  help: { type: "boolean" },
} as const;

const KNOWN_FLAGS = new Set([
  ...Object.keys(PARSE_OPTIONS),
  ...Object.values(PARSE_OPTIONS)
    .map((o) => ("short" in o ? o.short : undefined))
    .filter(Boolean),
]);

export type Command =
  | { op: "upgrade" }
  | { op: "help" }
  | { op: "install"; packages: string[] }
  | { op: "search"; query: string }
  | { op: "syncInfo"; package: string }
  | { op: "refreshDb" }
  | { op: "query" }
  | { op: "querySearch"; query: string }
  | { op: "queryInfo"; package: string }
  | { op: "remove"; flags: string; packages: string[] }
  | { op: "default"; names: string[] }
  | { op: "passthrough"; args: string[] }
  | { op: "error"; message: string };

export function parseCommand(argv: string[]): Command {
  if (argv.length === 0) {
    return { op: "upgrade" };
  }

  if (!argv[0].startsWith("-")) {
    return { op: "default", names: argv };
  }

  const { values, positionals, tokens } = parseArgs({
    args: argv,
    options: PARSE_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });

  const hasUnknownFlags = tokens.some((t) => t.kind === "option" && !KNOWN_FLAGS.has(t.name));
  if (hasUnknownFlags) return { op: "passthrough", args: argv };

  if (values.help) return { op: "help" };

  if (values.sync) {
    if (values.refresh && values.upgrades) return { op: "upgrade" };
    if (values.search) {
      return positionals[0]
        ? { op: "search", query: positionals[0] }
        : { op: "error", message: "no search query specified" };
    }
    if (values.info) {
      return positionals[0]
        ? { op: "syncInfo", package: positionals[0] }
        : { op: "error", message: "no package specified" };
    }
    if (values.refresh) return { op: "refreshDb" };
    return positionals.length > 0
      ? { op: "install", packages: positionals }
      : { op: "error", message: "no targets specified" };
  }

  if (values.query) {
    if (values.search) {
      return positionals[0]
        ? { op: "querySearch", query: positionals[0] }
        : { op: "error", message: "no search query specified" };
    }
    if (values.info) {
      return positionals[0]
        ? { op: "queryInfo", package: positionals[0] }
        : { op: "error", message: "no package specified" };
    }
    return { op: "query" };
  }

  if (values.remove) {
    if (positionals.length === 0) return { op: "error", message: "no targets specified" };
    let flags = "-R";
    if (values.nosave) flags += "n";
    if (values.search) flags += "s";
    return { op: "remove", flags, packages: positionals };
  }

  return { op: "passthrough", args: argv };
}

export async function dispatch(cmd: Command, services: Services): Promise<void> {
  switch (cmd.op) {
    case "help":
      services.output.info(USAGE);
      return;
    case "error":
      services.output.fail(cmd.message);
      return;
  }

  switch (cmd.op) {
    case "upgrade":
      await upgrade(services);
      return;
    case "default":
      await defaultCommand(cmd.names, services);
      return;
    case "search":
      await search(cmd.query, services);
      return;
    case "syncInfo":
      await syncInfo(cmd.package, services);
      return;
    case "refreshDb":
      await services.exec.sudoPacman(["-Sy"]);
      return;
    case "install":
      await install(cmd.packages, services);
      return;
    case "query":
      query(services);
      return;
    case "querySearch":
      querySearch(cmd.query, services);
      return;
    case "queryInfo":
      await queryInfo(cmd.package, services);
      return;
    case "remove":
      await services.exec.sudoPacman([cmd.flags, ...cmd.packages]);
      return;
    case "passthrough":
      await services.exec.sudoPacman(cmd.args);
      return;
  }
}
