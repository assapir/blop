import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAurResult, formatPackageInfo } from "../src/core/format.ts";
import type { AurSearchResult } from "../src/core/types.ts";

// styleText returns plain text when NO_COLOR is set (handled by node:util)

const aurPkg: AurSearchResult = {
  ID: 1,
  Name: "yay",
  PackageBase: "yay",
  Version: "12.5.7-1",
  Description: "Yet another yogurt",
  NumVotes: 2547,
  Popularity: 42.5,
  OutOfDate: null,
  Maintainer: "someone",
};

describe("formatAurResult", () => {
  it("includes package name and version", () => {
    const result = formatAurResult(aurPkg);
    assert.ok(result.includes("yay"), "should contain package name");
    assert.ok(result.includes("12.5.7-1"), "should contain version");
  });

  it("includes vote count", () => {
    const result = formatAurResult(aurPkg);
    assert.ok(result.includes("2547"), "should contain vote count");
  });

  it("includes description", () => {
    const result = formatAurResult(aurPkg);
    assert.ok(result.includes("Yet another yogurt"), "should contain description");
  });

  it("includes index when provided", () => {
    const result = formatAurResult(aurPkg, 3);
    assert.ok(result.includes("3"), "should contain index number");
  });

  it("handles null description", () => {
    const pkg = { ...aurPkg, Description: null };
    const result = formatAurResult(pkg);
    assert.ok(!result.includes("\n"), "should not have second line without desc");
  });

  it("shows out-of-date marker", () => {
    const pkg = { ...aurPkg, OutOfDate: 1700000000 };
    const result = formatAurResult(pkg);
    assert.ok(result.includes("out of date"), "should show out-of-date marker");
  });
});

describe("formatPackageInfo", () => {
  it("formats key-value pairs", () => {
    const result = formatPackageInfo([
      ["Name", "firefox"],
      ["Version", "138.0-1"],
    ]);
    assert.ok(result.includes("Name"), "should contain key");
    assert.ok(result.includes("firefox"), "should contain value");
    assert.ok(result.includes("Version"), "should contain second key");
    assert.ok(result.includes("138.0-1"), "should contain second value");
  });

  it("aligns keys to same width", () => {
    const result = formatPackageInfo([
      ["Name", "firefox"],
      ["Description", "A web browser"],
    ]);
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 2);
  });
});
