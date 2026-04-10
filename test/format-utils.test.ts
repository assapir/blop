import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { formatSize, formatDate, joinDeps, fail, formatRepoResult } from "../src/core/format.ts";
import { makePkg } from "./fakes/fixtures.ts";

describe("formatSize", () => {
  it("formats bytes", () => {
    assert.strictEqual(formatSize(512), "512 B");
  });

  it("formats KiB", () => {
    assert.strictEqual(formatSize(1024), "1.0 KiB");
    assert.strictEqual(formatSize(1536), "1.5 KiB");
  });

  it("formats MiB", () => {
    assert.strictEqual(formatSize(1024 * 1024), "1.0 MiB");
  });

  it("formats GiB", () => {
    assert.strictEqual(formatSize(1024 * 1024 * 1024), "1.00 GiB");
  });

  it("handles zero", () => {
    assert.strictEqual(formatSize(0), "0 B");
  });
});

describe("formatDate", () => {
  it("converts epoch to YYYY-MM-DD", () => {
    assert.strictEqual(formatDate(1700000000), "2023-11-14");
  });

  it("handles epoch 0", () => {
    assert.strictEqual(formatDate(0), "1970-01-01");
  });
});

describe("joinDeps", () => {
  it("joins multiple deps", () => {
    const deps = [{ depString: "foo>=1.0" }, { depString: "bar" }];
    assert.strictEqual(joinDeps(deps), "foo>=1.0  bar");
  });

  it("returns None for empty array", () => {
    assert.strictEqual(joinDeps([]), "None");
  });

  it("handles single dep", () => {
    assert.strictEqual(joinDeps([{ depString: "foo" }]), "foo");
  });
});

describe("fail", () => {
  it("sets process.exitCode to 1", () => {
    const original = process.exitCode;
    try {
      fail("test error");
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });
});

describe("formatRepoResult", () => {
  const pkg = makePkg({ name: "firefox", version: "149.0-1", dbName: "extra" });

  it("includes package name and version", () => {
    const result = formatRepoResult(pkg);
    assert.ok(result.includes("firefox"), "should contain name");
    assert.ok(result.includes("149.0-1"), "should contain version");
  });

  it("includes repo name", () => {
    const result = formatRepoResult(pkg);
    assert.ok(result.includes("extra"), "should contain repo name");
  });

  it("includes description", () => {
    const result = formatRepoResult(pkg);
    assert.ok(result.includes("Description of firefox"), "should contain description");
  });

  it("includes index when provided", () => {
    const result = formatRepoResult(pkg, 5);
    assert.ok(result.includes("5"), "should contain index");
  });

  it("handles missing description", () => {
    const noPkg = makePkg({ name: "foo", desc: undefined });
    const result = formatRepoResult(noPkg);
    assert.ok(!result.includes("\n"), "should not have second line");
  });
});
