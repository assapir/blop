import { styleText } from "node:util";
import type { Output, PackageInfo } from "../contracts/services.ts";
import type { AurSearchResult } from "../core/types.ts";

type TextFormat = Parameters<typeof styleText>[0];

export class OutputService implements Output {
  #colorEnabled: boolean;

  constructor(colorEnabled: boolean) {
    this.#colorEnabled = colorEnabled;
  }

  #stylize(format: TextFormat, text: string): string {
    if (
      !this.#colorEnabled ||
      process.env.NO_COLOR !== undefined ||
      process.env.NODE_DISABLE_COLORS !== undefined
    ) {
      return text;
    }

    return styleText(format, text, { validateStream: false });
  }

  formatRepoResult(pkg: PackageInfo, index?: number): string {
    const prefix = index != null ? this.#stylize("bold", `${index}  `) : "";
    const repo = this.#stylize(["bold", "cyanBright"], pkg.dbName ?? "unknown");
    const name = this.#stylize(["bold", "whiteBright"], `/${pkg.name}`);
    const ver = this.#stylize(["bold", "greenBright"], ` ${pkg.version}`);
    const desc = pkg.desc ? `\n${prefix ? "    " : "   "}${this.#stylize("dim", pkg.desc)}` : "";
    return `${prefix}${repo}${name}${ver}${desc}`;
  }

  formatAurResult(pkg: AurSearchResult, index?: number): string {
    const prefix = index != null ? this.#stylize("bold", `${index}  `) : "";
    const repo = this.#stylize(["bold", "magentaBright"], "aur");
    const name = this.#stylize(["bold", "whiteBright"], `/${pkg.Name}`);
    const ver = this.#stylize(["bold", "greenBright"], ` ${pkg.Version}`);
    const votes = this.#stylize("yellowBright", ` (+${pkg.NumVotes})`);
    const pop = this.#stylize("dim", ` ${pkg.Popularity.toFixed(2)}`);
    const ood = pkg.OutOfDate ? this.#stylize(["bold", "redBright"], " [out of date]") : "";
    const desc = pkg.Description
      ? `\n${prefix ? "    " : "   "}${this.#stylize("dim", pkg.Description)}`
      : "";
    return `${prefix}${repo}${name}${ver}${votes}${pop}${ood}${desc}`;
  }

  formatPackageInfo(fields: [string, string][]): string {
    const maxKey = Math.max(...fields.map(([k]) => k.length));
    return fields
      .map(([key, val]) => {
        const label = this.#stylize(["bold", "cyanBright"], key.padEnd(maxKey));
        return `${label}  ${val}`;
      })
      .join("\n");
  }

  formatPrompt(message: string): string {
    return this.#stylize(["bold", "cyanBright"], message);
  }

  formatSection(message: string): string {
    return `${this.#stylize(["bold", "blueBright"], "==>")} ${this.#stylize(["bold", "whiteBright"], message)}`;
  }

  info(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(this.#stylize(["bold", "redBright"], `error: ${message}`));
  }

  fail(message: string): void {
    this.error(message);
    process.exitCode = 1;
  }

  section(message: string): void {
    this.info(this.formatSection(message));
  }
}
