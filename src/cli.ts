import { parseArgs } from "node:util";
import { error, section } from "./core/format.ts";
import { sudoPacman } from "./core/exec.ts";

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
  return `Usage: blop [operation] [package(s)]

Smart defaults:
  blop                  System upgrade (repos + AUR)
  blop <name>           Smart: install, remove, or search

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

export async function main(): Promise<void> {
  const cmd = parseCommand(process.argv.slice(2));

  switch (cmd.op) {
    case "help":
      console.log(USAGE);
      return;
    case "error":
      error(cmd.message);
      process.exitCode = 1;
      return;
    case "upgrade":
      section("Upgrading system...");
      // TODO: upgrade()
      return;
    case "default":
      section(`Smart lookup: ${cmd.names.join(", ")}...`);
      // TODO: defaultCommand(cmd.names)
      return;
    case "search":
      section(`Searching for "${cmd.query}"...`);
      // TODO: search(cmd.query)
      return;
    case "syncInfo":
      section(`Info: ${cmd.package}`);
      // TODO: syncInfo(cmd.package)
      return;
    case "refreshDb":
      await sudoPacman(["-Sy"]);
      return;
    case "install":
      section(`Installing: ${cmd.packages.join(", ")}...`);
      // TODO: install(cmd.packages)
      return;
    case "query":
      section("Listing installed packages...");
      // TODO: query()
      return;
    case "querySearch":
      section(`Searching installed for "${cmd.query}"...`);
      // TODO: querySearch(cmd.query)
      return;
    case "queryInfo":
      section(`Installed info: ${cmd.package}`);
      // TODO: queryInfo(cmd.package)
      return;
    case "remove":
      await sudoPacman([cmd.flags, ...cmd.packages]);
      return;
    case "passthrough":
      await sudoPacman(cmd.args);
      return;
  }
}
