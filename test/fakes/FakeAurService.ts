import type { AurSearchResult, AurInfoResult } from "../../src/core/types.ts";
import type { Aur } from "../../src/contracts/services.ts";

export class FakeAurService implements Aur {
  #packages: AurInfoResult[] = [];

  addPackage(pkg: AurInfoResult): void {
    this.#packages.push(pkg);
  }

  async search(query: string): Promise<AurSearchResult[]> {
    return this.#packages.filter(
      (p) => p.Name.includes(query) || (p.Description ?? "").includes(query),
    );
  }

  async info(names: string[]): Promise<AurInfoResult[]> {
    const set = new Set(names);
    return this.#packages.filter((p) => set.has(p.Name));
  }
}
