import { stripVTControlCharacters } from "node:util";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { OutputService } from "../src/services/OutputService.ts";
import type { AurSearchResult } from "../src/core/types.ts";
import { makePkg } from "./fakes/fixtures.ts";

let previousNoColor: string | undefined;
let previousNodeDisableColors: string | undefined;

beforeEach(() => {
  previousNoColor = process.env.NO_COLOR;
  previousNodeDisableColors = process.env.NODE_DISABLE_COLORS;
  delete process.env.NO_COLOR;
  delete process.env.NODE_DISABLE_COLORS;
});

afterEach(() => {
  if (previousNoColor === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = previousNoColor;
  }

  if (previousNodeDisableColors === undefined) {
    delete process.env.NODE_DISABLE_COLORS;
  } else {
    process.env.NODE_DISABLE_COLORS = previousNodeDisableColors;
  }
});

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

describe("formatRepoResult", () => {
  const pkg = makePkg({ name: "firefox", version: "149.0-1", dbName: "extra" });

  it("includes repo name and version", () => {
    const result = new OutputService(false).formatRepoResult(pkg);
    assert.ok(result.includes("extra/firefox"), "should contain repo and package name");
    assert.ok(result.includes("149.0-1"), "should contain version");
  });

  it("includes description on a second line", () => {
    const result = new OutputService(false).formatRepoResult(pkg);
    assert.ok(result.includes("\n"), "should include a description line");
    assert.ok(result.includes("Description of firefox"), "should contain description");
  });

  it("includes index when provided", () => {
    const result = new OutputService(false).formatRepoResult(pkg, 5);
    assert.ok(result.startsWith("5  "), "should prefix the result with the index");
  });

  it("omits the description line when missing", () => {
    const result = new OutputService(false).formatRepoResult(
      makePkg({ name: "foo", desc: undefined }),
    );
    assert.ok(!result.includes("\n"), "should not have a second line without a description");
  });
});

describe("formatAurResult", () => {
  it("includes package name and version", () => {
    const result = new OutputService(false).formatAurResult(aurPkg);
    assert.ok(result.includes("yay"), "should contain package name");
    assert.ok(result.includes("12.5.7-1"), "should contain version");
  });

  it("includes vote count", () => {
    const result = new OutputService(false).formatAurResult(aurPkg);
    assert.ok(result.includes("2547"), "should contain vote count");
  });

  it("includes description", () => {
    const result = new OutputService(false).formatAurResult(aurPkg);
    assert.ok(result.includes("Yet another yogurt"), "should contain description");
  });

  it("includes index when provided", () => {
    const result = new OutputService(false).formatAurResult(aurPkg, 3);
    assert.ok(result.includes("3"), "should contain index number");
  });

  it("handles null description", () => {
    const pkg = { ...aurPkg, Description: null };
    const result = new OutputService(false).formatAurResult(pkg);
    assert.ok(!result.includes("\n"), "should not have second line without desc");
  });

  it("shows out-of-date marker", () => {
    const pkg = { ...aurPkg, OutOfDate: 1700000000 };
    const result = new OutputService(false).formatAurResult(pkg);
    assert.ok(result.includes("out of date"), "should show out-of-date marker");
  });
});

describe("formatPackageInfo", () => {
  it("formats key-value pairs", () => {
    const result = new OutputService(false).formatPackageInfo([
      ["Name", "firefox"],
      ["Version", "138.0-1"],
    ]);
    assert.ok(result.includes("Name"), "should contain key");
    assert.ok(result.includes("firefox"), "should contain value");
    assert.ok(result.includes("Version"), "should contain second key");
    assert.ok(result.includes("138.0-1"), "should contain second value");
  });

  it("aligns keys to same width", () => {
    const result = new OutputService(false).formatPackageInfo([
      ["Name", "firefox"],
      ["Description", "A web browser"],
    ]);
    const lines = result.split("\n");
    assert.strictEqual(lines.length, 2);
  });
});

describe("formatSection", () => {
  it("uses the new sharp marker", () => {
    const result = new OutputService(false).formatSection("Installing from repos: firefox");
    assert.strictEqual(result, "==> Installing from repos: firefox");
  });

  it("emits styled output when colors are enabled", () => {
    const result = new OutputService(true).formatSection("Resolving AUR dependencies...");
    assert.notStrictEqual(result, stripVTControlCharacters(result));
    assert.strictEqual(stripVTControlCharacters(result), "==> Resolving AUR dependencies...");
  });

  it("emits plain output when colors are disabled", () => {
    const result = new OutputService(false).formatSection("Checking AUR packages...");
    assert.strictEqual(result, "==> Checking AUR packages...");
  });

  it("respects NO_COLOR even when output colors are enabled", () => {
    process.env.NO_COLOR = "1";
    const result = new OutputService(true).formatSection("Checking AUR packages...");
    assert.strictEqual(result, "==> Checking AUR packages...");
  });
});
