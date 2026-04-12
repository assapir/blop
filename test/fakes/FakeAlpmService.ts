import type { Alpm, PackageInfo } from "../../src/contracts/services.ts";
import { parseDepName } from "../../src/core/types.ts";

export class FakeAlpmService implements Alpm {
  #local = new Map<string, PackageInfo>();
  #sync = new Map<string, PackageInfo>();

  addLocal(pkg: PackageInfo): void {
    this.#local.set(pkg.name, pkg);
  }

  addSync(pkg: PackageInfo): void {
    this.#sync.set(pkg.name, pkg);
  }

  isInstalled(name: string): boolean {
    return this.#local.has(name);
  }

  getInstalledPkg(name: string): PackageInfo | null {
    return this.#local.get(name) ?? null;
  }

  getInstalledPackages(): PackageInfo[] {
    return [...this.#local.values()];
  }

  getForeignPackages(): PackageInfo[] {
    return [...this.#local.values()].filter((p) => !this.#sync.has(p.name));
  }

  findSatisfier(depstring: string): PackageInfo | null {
    const name = parseDepName(depstring);
    return this.#sync.get(name) ?? null;
  }

  findSatisfierLocal(depstring: string): PackageInfo | null {
    const name = parseDepName(depstring);
    return this.#local.get(name) ?? null;
  }

  searchSync(queries: string[]): PackageInfo[] {
    return [...this.#sync.values()].filter((p) =>
      queries.some((q) => p.name.includes(q) || (p.desc ?? "").includes(q)),
    );
  }

  searchLocal(queries: string[]): PackageInfo[] {
    return [...this.#local.values()].filter((p) =>
      queries.some((q) => p.name.includes(q) || (p.desc ?? "").includes(q)),
    );
  }

  vercmp(a: string, b: string): number {
    return a.localeCompare(b);
  }
}
