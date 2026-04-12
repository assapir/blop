import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { AlpmService } from "../src/services/AlpmService.ts";
import { PacmanConfService } from "../src/services/PacmanConfService.ts";
import { run } from "../src/core/exec.ts";

describe("AlpmService", () => {
  let alpm: AlpmService;

  before(async () => {
    const pacmanConf = new PacmanConfService(run);
    alpm = await AlpmService.create(pacmanConf);
  });

  it("creates successfully", () => {
    assert.ok(alpm, "should create an AlpmService instance");
  });

  it("isInstalled returns true for pacman", () => {
    assert.strictEqual(alpm.isInstalled("pacman"), true);
  });

  it("isInstalled returns false for nonexistent package", () => {
    assert.strictEqual(alpm.isInstalled("nonexistent_pkg_xyz_99999"), false);
  });

  it("getInstalledPkg returns PackageInfo for pacman", () => {
    const pkg = alpm.getInstalledPkg("pacman");
    assert.ok(pkg, "should find pacman");
    assert.strictEqual(pkg.name, "pacman");
    assert.ok(pkg.version.length > 0, "should have a version");
  });

  it("getInstalledPkg returns null for nonexistent package", () => {
    assert.strictEqual(alpm.getInstalledPkg("nonexistent_pkg_xyz_99999"), null);
  });

  it("getInstalledPackages returns non-empty array", () => {
    const pkgs = alpm.getInstalledPackages();
    assert.ok(pkgs.length > 0, "should have installed packages");
  });

  it("findSatisfier returns PackageInfo for pacman", () => {
    const pkg = alpm.findSatisfier("pacman");
    assert.ok(pkg, "should find pacman in sync DBs");
    assert.strictEqual(pkg.name, "pacman");
  });

  it("findSatisfier returns null for nonexistent package", () => {
    assert.strictEqual(alpm.findSatisfier("nonexistent_pkg_xyz_99999"), null);
  });

  it("searchSync finds pacman", () => {
    const results = alpm.searchSync(["pacman"]);
    assert.ok(results.length > 0, "should find results for pacman");
    assert.ok(
      results.some((p) => p.name === "pacman"),
      "should include pacman itself",
    );
  });

  it("getForeignPackages returns an array", () => {
    const foreign = alpm.getForeignPackages();
    assert.ok(Array.isArray(foreign), "should return an array");
  });

  it("vercmp compares versions correctly", () => {
    assert.ok(alpm.vercmp("1.0-1", "2.0-1") < 0, "1.0 should be less than 2.0");
    assert.ok(alpm.vercmp("2.0-1", "1.0-1") > 0, "2.0 should be greater than 1.0");
    assert.strictEqual(alpm.vercmp("1.0-1", "1.0-1"), 0, "equal versions should return 0");
  });
});
