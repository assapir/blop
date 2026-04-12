import type { Output, PackageInfo } from "../../src/contracts/services.ts";
import type { AurSearchResult } from "../../src/core/types.ts";

export class FakeOutputService implements Output {
  calls: { fn: string; args: unknown[] }[] = [];

  formatRepoResult(pkg: PackageInfo, index?: number): string {
    const prefix = index != null ? `${index}  ` : "";
    const desc = pkg.desc ? `\n${prefix ? "    " : "   "}${pkg.desc}` : "";
    return `${prefix}${pkg.dbName ?? "unknown"}/${pkg.name} ${pkg.version}${desc}`;
  }

  formatAurResult(pkg: AurSearchResult, index?: number): string {
    const prefix = index != null ? `${index}  ` : "";
    const desc = pkg.Description ? `\n${prefix ? "    " : "   "}${pkg.Description}` : "";
    const ood = pkg.OutOfDate ? " [out of date]" : "";
    return `${prefix}aur/${pkg.Name} ${pkg.Version} (+${pkg.NumVotes}) ${pkg.Popularity.toFixed(2)}${ood}${desc}`;
  }

  formatPackageInfo(fields: [string, string][]): string {
    const maxKey = Math.max(...fields.map(([k]) => k.length));
    return fields.map(([key, val]) => `${key.padEnd(maxKey)}  ${val}`).join("\n");
  }

  formatPrompt(message: string): string {
    return message;
  }

  formatSection(message: string): string {
    return `==> ${message}`;
  }

  info(message: string): void {
    this.calls.push({ fn: "info", args: [message] });
  }

  error(message: string): void {
    this.calls.push({ fn: "error", args: [message] });
  }

  fail(message: string): void {
    this.calls.push({ fn: "fail", args: [message] });
    process.exitCode = 1;
  }

  section(message: string): void {
    this.calls.push({ fn: "section", args: [message] });
  }
}
