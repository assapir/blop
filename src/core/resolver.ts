import type { Alpm, Aur } from "../contracts/services.ts";
import type { AurInfoResult, ResolvedPackage, InstallPlan } from "./types.ts";
import { parseDepName } from "./types.ts";

// NOTE: This resolver does not handle virtual "Provides" dependencies.
// If an AUR dep is satisfied by another AUR package's Provides entry,
// the lookup by bare name will fail. This is a known limitation shared
// by simpler AUR helpers; yay/paru solve it with provider search.

export async function resolve(names: string[], alpm: Alpm, aur: Aur): Promise<InstallPlan> {
  const syncPackages = new Set<string>();
  const aurPackages = new Map<string, ResolvedPackage>();
  const aurInfoCache = new Map<string, AurInfoResult>();

  const infos = await aur.info(names);
  for (const info of infos) {
    aurInfoCache.set(info.Name, info);
  }
  for (const name of names) {
    if (!aurInfoCache.has(name)) {
      throw new Error(`package '${name}' was not found in AUR`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  async function dfs(name: string): Promise<void> {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`circular dependency detected: ${name}`);
    }

    visiting.add(name);

    let pkgInfo = aurInfoCache.get(name);
    if (!pkgInfo) {
      const fetched = await aur.info([name]);
      if (fetched.length === 0) {
        throw new Error(`AUR dependency '${name}' not found`);
      }
      pkgInfo = fetched[0];
      aurInfoCache.set(name, pkgInfo);
    }

    // Collect unknown AUR deps for batch fetching
    const aurDepsToFetch: string[] = [];
    const deps = [...pkgInfo.Depends, ...pkgInfo.MakeDepends];
    for (const dep of deps) {
      const depName = parseDepName(dep);
      if (alpm.findSatisfierLocal(dep)) continue;
      const repoSatisfier = alpm.findSatisfier(dep);
      if (repoSatisfier) {
        syncPackages.add(repoSatisfier.name);
        continue;
      }
      if (!aurInfoCache.has(depName) && !visiting.has(depName)) {
        aurDepsToFetch.push(depName);
      }
    }

    // Batch-fetch all unknown AUR deps at once
    if (aurDepsToFetch.length > 0) {
      const fetched = await aur.info(aurDepsToFetch);
      for (const info of fetched) {
        aurInfoCache.set(info.Name, info);
      }
    }

    // Now recurse into AUR deps
    for (const dep of deps) {
      const depName = parseDepName(dep);
      if (alpm.findSatisfierLocal(dep)) continue;
      if (alpm.findSatisfier(dep)) continue;
      await dfs(depName);
    }

    visiting.delete(name);
    visited.add(name);

    aurPackages.set(name, {
      name: pkgInfo.Name,
      version: pkgInfo.Version,
      packageBase: pkgInfo.PackageBase,
      depends: pkgInfo.Depends,
      makeDepends: pkgInfo.MakeDepends,
    });
  }

  for (const name of names) {
    await dfs(name);
  }

  return {
    syncPackages: [...syncPackages],
    aurPackages: topoSort(aurPackages),
  };
}

function topoSort(pkgs: Map<string, ResolvedPackage>): ResolvedPackage[] {
  const names = new Set(pkgs.keys());
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const name of names) {
    inDegree.set(name, 0);
    adj.set(name, []);
  }

  for (const [name, pkg] of pkgs) {
    for (const dep of [...pkg.depends, ...pkg.makeDepends]) {
      const depName = parseDepName(dep);
      if (names.has(depName)) {
        adj.get(depName)!.push(name);
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const result: ResolvedPackage[] = [];
  let head = 0;
  while (head < queue.length) {
    const name = queue[head++];
    result.push(pkgs.get(name)!);
    for (const next of adj.get(name)!) {
      const d = inDegree.get(next)! - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  if (result.length !== names.size) {
    throw new Error("circular dependency in AUR packages");
  }

  return result;
}
