import type { PackageInfo } from "../../src/contracts/services.ts";
import type { AurInfoResult } from "../../src/core/types.ts";

let nextId = 1;

export function makePkg(overrides: Partial<PackageInfo> & { name: string }): PackageInfo {
  return {
    version: "1.0-1",
    desc: `Description of ${overrides.name}`,
    url: `https://example.com/${overrides.name}`,
    arch: "x86_64",
    size: 1024,
    isize: 4096,
    reason: 0,
    buildDate: 1700000000,
    packager: "test",
    licenses: ["MIT"],
    groups: [],
    depends: [],
    optdepends: [],
    makedepends: [],
    checkdepends: [],
    conflicts: [],
    provides: [],
    replaces: [],
    requiredBy: [],
    optionalFor: [],
    hasScriptlet: false,
    ...overrides,
  };
}

export function makeAurPkg(overrides: Partial<AurInfoResult> & { Name: string }): AurInfoResult {
  return {
    ID: nextId++,
    PackageBase: overrides.Name,
    Version: "1.0-1",
    Description: `AUR package ${overrides.Name}`,
    NumVotes: 100,
    Popularity: 10.0,
    OutOfDate: null,
    Maintainer: "maintainer",
    Depends: [],
    MakeDepends: [],
    CheckDepends: [],
    OptDepends: [],
    Conflicts: [],
    Provides: [],
    Replaces: [],
    License: ["MIT"],
    URL: `https://example.com/${overrides.Name}`,
    URLPath: `/cgit/aur.git/snapshot/${overrides.Name}.tar.gz`,
    Keywords: [],
    FirstSubmitted: 1600000000,
    LastModified: 1700000000,
    ...overrides,
  };
}
