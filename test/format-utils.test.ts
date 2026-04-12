import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatSize, formatDate, joinDeps } from "../src/core/format.ts";

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
