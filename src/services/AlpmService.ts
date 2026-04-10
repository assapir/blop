import { AlpmHandle, sigLevel, vercmp } from "libalpm";
import type { PackageInfo } from "libalpm";
import type { Alpm, PacmanConf } from "../contracts/services.ts";

export class AlpmService implements Alpm {
  #handle: AlpmHandle;

  constructor(handle: AlpmHandle) {
    this.#handle = handle;
  }

  static async create(pacmanConf: PacmanConf): Promise<AlpmService> {
    const repos = await pacmanConf.getRepoList();
    const handle = new AlpmHandle("/", "/var/lib/pacman/");
    const flags = sigLevel();
    const level = flags.packageOptional | flags.databaseOptional;
    for (const repo of repos) {
      handle.registerSyncDb(repo, level);
    }
    return new AlpmService(handle);
  }

  isInstalled(name: string): boolean {
    try {
      this.#handle.getLocalPkg(name);
      return true;
    } catch {
      return false;
    }
  }

  getInstalledPkg(name: string): PackageInfo | null {
    try {
      return this.#handle.getLocalPkg(name);
    } catch {
      return null;
    }
  }

  getInstalledPackages(): PackageInfo[] {
    return this.#handle.getLocalPkgs();
  }

  getForeignPackages(): PackageInfo[] {
    return this.#handle
      .getLocalPkgs()
      .filter((p) => this.#handle.findSatisfierSync(p.name) == null);
  }

  findSatisfier(depstring: string): PackageInfo | null {
    return this.#handle.findSatisfierSync(depstring);
  }

  findSatisfierLocal(depstring: string): PackageInfo | null {
    return this.#handle.findSatisfierLocal(depstring);
  }

  searchSync(queries: string[]): PackageInfo[] {
    return this.#handle.searchAllSync(queries);
  }

  searchLocal(queries: string[]): PackageInfo[] {
    return this.#handle.searchLocal(queries);
  }

  vercmp(a: string, b: string): number {
    return vercmp(a, b);
  }
}
