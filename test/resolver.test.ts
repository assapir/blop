import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "../src/core/resolver.ts";
import { FakeAlpmService } from "./fakes/FakeAlpmService.ts";
import { FakeAurService } from "./fakes/FakeAurService.ts";
import { makePkg, makeAurPkg } from "./fakes/fixtures.ts";

describe("resolve", () => {
  it("resolves a single package with no deps", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    aur.addPackage(makeAurPkg({ Name: "foo" }));

    const plan = await resolve(["foo"], alpm, aur);
    assert.deepStrictEqual(plan.syncPackages, []);
    assert.strictEqual(plan.aurPackages.length, 1);
    assert.strictEqual(plan.aurPackages[0].name, "foo");
  });

  it("puts repo deps into syncPackages", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    alpm.addSync(makePkg({ name: "libbar" }));
    aur.addPackage(makeAurPkg({ Name: "foo", Depends: ["libbar"] }));

    const plan = await resolve(["foo"], alpm, aur);
    assert.deepStrictEqual(plan.syncPackages, ["libbar"]);
    assert.strictEqual(plan.aurPackages.length, 1);
    assert.strictEqual(plan.aurPackages[0].name, "foo");
  });

  it("skips locally installed deps", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    alpm.addLocal(makePkg({ name: "libbaz" }));
    aur.addPackage(makeAurPkg({ Name: "foo", Depends: ["libbaz"] }));

    const plan = await resolve(["foo"], alpm, aur);
    assert.deepStrictEqual(plan.syncPackages, []);
    assert.strictEqual(plan.aurPackages.length, 1);
  });

  it("resolves transitive AUR deps in topo order", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    aur.addPackage(makeAurPkg({ Name: "app", Depends: ["lib"] }));
    aur.addPackage(makeAurPkg({ Name: "lib" }));

    const plan = await resolve(["app"], alpm, aur);
    assert.strictEqual(plan.aurPackages.length, 2);
    // lib must come before app (dependency first)
    const names = plan.aurPackages.map((p) => p.name);
    assert.ok(names.indexOf("lib") < names.indexOf("app"), `expected lib before app, got ${names}`);
  });

  it("resolves mixed repo + AUR deps", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    alpm.addSync(makePkg({ name: "glibc" }));
    alpm.addLocal(makePkg({ name: "bash" }));
    aur.addPackage(makeAurPkg({ Name: "app", Depends: ["glibc", "bash", "aurlib"] }));
    aur.addPackage(makeAurPkg({ Name: "aurlib" }));

    const plan = await resolve(["app"], alpm, aur);
    assert.deepStrictEqual(plan.syncPackages, ["glibc"]);
    assert.strictEqual(plan.aurPackages.length, 2);
  });

  it("handles MakeDepends", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    alpm.addSync(makePkg({ name: "go" }));
    aur.addPackage(makeAurPkg({ Name: "foo", MakeDepends: ["go"] }));

    const plan = await resolve(["foo"], alpm, aur);
    assert.deepStrictEqual(plan.syncPackages, ["go"]);
  });

  it("handles versioned deps", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    alpm.addSync(makePkg({ name: "openssl" }));
    aur.addPackage(makeAurPkg({ Name: "foo", Depends: ["openssl>=3.0"] }));

    const plan = await resolve(["foo"], alpm, aur);
    assert.deepStrictEqual(plan.syncPackages, ["openssl"]);
  });

  it("throws on circular dependency", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    aur.addPackage(makeAurPkg({ Name: "a", Depends: ["b"] }));
    aur.addPackage(makeAurPkg({ Name: "b", Depends: ["a"] }));

    await assert.rejects(() => resolve(["a"], alpm, aur), /circular dependency/);
  });

  it("throws when package not found in AUR", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();

    await assert.rejects(() => resolve(["nonexistent"], alpm, aur), /not found in AUR/);
  });

  it("throws when AUR dependency not found", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    aur.addPackage(makeAurPkg({ Name: "foo", Depends: ["missing"] }));

    await assert.rejects(() => resolve(["foo"], alpm, aur), /not found/);
  });

  it("resolves multiple top-level packages", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    aur.addPackage(makeAurPkg({ Name: "foo" }));
    aur.addPackage(makeAurPkg({ Name: "bar" }));

    const plan = await resolve(["foo", "bar"], alpm, aur);
    assert.strictEqual(plan.aurPackages.length, 2);
    const names = plan.aurPackages.map((p) => p.name);
    assert.ok(names.includes("foo"));
    assert.ok(names.includes("bar"));
  });

  it("uses satisfier package name, not parsed dep string", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    // The sync package is named "openssl" but the dep string has a version
    alpm.addSync(makePkg({ name: "openssl" }));
    aur.addPackage(makeAurPkg({ Name: "app", Depends: ["openssl>=3.0"] }));

    const plan = await resolve(["app"], alpm, aur);
    // Should be "openssl" (from PackageInfo.name), not "openssl" (from parseDepName)
    // Both happen to match here, but the code path goes through repoSatisfier.name
    assert.deepStrictEqual(plan.syncPackages, ["openssl"]);
  });

  it("deduplicates shared deps", async () => {
    const alpm = new FakeAlpmService();
    const aur = new FakeAurService();
    aur.addPackage(makeAurPkg({ Name: "a", Depends: ["shared"] }));
    aur.addPackage(makeAurPkg({ Name: "b", Depends: ["shared"] }));
    aur.addPackage(makeAurPkg({ Name: "shared" }));

    const plan = await resolve(["a", "b"], alpm, aur);
    const names = plan.aurPackages.map((p) => p.name);
    assert.strictEqual(names.filter((n) => n === "shared").length, 1, "shared should appear once");
  });
});
