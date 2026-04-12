import { styleText } from "node:util";
import { createInterface } from "node:readline/promises";
import type { AurSearchResult } from "./types.ts";
import type { PackageInfo } from "libalpm";

export function formatRepoResult(pkg: PackageInfo, index?: number): string {
  const prefix = index != null ? styleText("bold", `${index}  `) : "";
  const repo = styleText(["bold", "cyanBright"], pkg.dbName ?? "unknown");
  const name = styleText(["bold", "whiteBright"], `/${pkg.name}`);
  const ver = styleText(["bold", "greenBright"], ` ${pkg.version}`);
  const desc = pkg.desc ? `\n${prefix ? "    " : "   "}${styleText("dim", pkg.desc)}` : "";
  return `${prefix}${repo}${name}${ver}${desc}`;
}

export function formatAurResult(pkg: AurSearchResult, index?: number): string {
  const prefix = index != null ? styleText("bold", `${index}  `) : "";
  const repo = styleText(["bold", "magentaBright"], "aur");
  const name = styleText(["bold", "whiteBright"], `/${pkg.Name}`);
  const ver = styleText(["bold", "greenBright"], ` ${pkg.Version}`);
  const votes = styleText("yellowBright", ` (+${pkg.NumVotes})`);
  const pop = styleText("dim", ` ${pkg.Popularity.toFixed(2)}`);
  const ood = pkg.OutOfDate ? styleText(["bold", "redBright"], " [out of date]") : "";
  const desc = pkg.Description
    ? `\n${prefix ? "    " : "   "}${styleText("dim", pkg.Description)}`
    : "";
  return `${prefix}${repo}${name}${ver}${votes}${pop}${ood}${desc}`;
}

export function formatPackageInfo(fields: [string, string][]): string {
  const maxKey = Math.max(...fields.map(([k]) => k.length));
  return fields
    .map(([key, val]) => {
      const label = styleText(["bold", "cyanBright"], key.padEnd(maxKey));
      return `${label}  ${val}`;
    })
    .join("\n");
}

type PromptOpts = { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream };

export async function prompt(message: string, opts?: PromptOpts): Promise<string> {
  const rl = createInterface({
    input: opts?.input ?? process.stdin,
    output: opts?.output ?? process.stdout,
  });
  try {
    return await rl.question(styleText(["bold", "cyanBright"], message));
  } finally {
    rl.close();
  }
}

export async function confirm(message: string, opts?: PromptOpts): Promise<boolean> {
  const input = opts?.input ?? process.stdin;
  const answer = await prompt(`→ ${message} (Y/n) `, opts);
  const normalized = answer.trim().toLowerCase();
  if (normalized === "y" || normalized === "yes") return true;
  if (normalized === "") return "isTTY" in input && input.isTTY === true;
  return false;
}

export async function pickNumber(
  message: string,
  max: number,
  opts?: PromptOpts,
): Promise<number | null> {
  const answer = await prompt(`${message} `, opts);
  const trimmed = answer.trim();
  if (trimmed === "q" || trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n < 1 || n > max) return null;
  return n;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

export function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toISOString().split("T")[0];
}

export function joinDeps(deps: { depString: string }[]): string {
  return deps.map((d) => d.depString).join("  ") || "None";
}

export function error(msg: string): void {
  console.error(styleText(["bold", "redBright"], `error: ${msg}`));
}

export function fail(msg: string): void {
  error(msg);
  process.exitCode = 1;
}

export function info(msg: string): void {
  console.log(msg);
}

export function section(msg: string): void {
  console.log(
    `${styleText(["bold", "blueBright"], "::")} ${styleText(["bold", "whiteBright"], msg)}`,
  );
}
