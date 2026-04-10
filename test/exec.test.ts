import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { run, findBuiltPackages } from "../src/core/exec.ts";

describe("run", () => {
  it("captures stdout", async () => {
    const { stdout } = await run("echo", ["hello"]);
    assert.strictEqual(stdout.trim(), "hello");
  });

  it("captures stderr", async () => {
    const { stderr } = await run("sh", ["-c", "echo oops >&2"]);
    assert.strictEqual(stderr.trim(), "oops");
  });

  it("rejects on failure", async () => {
    await assert.rejects(() => run("false", []), "should reject for non-zero exit");
  });
});

describe("findBuiltPackages", () => {
  it("finds .pkg.tar.zst files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "naruto-test-"));
    try {
      await writeFile(join(dir, "foo-1.0-1-x86_64.pkg.tar.zst"), "");
      await writeFile(join(dir, "bar-2.0-1-x86_64.pkg.tar.xz"), "");
      await writeFile(join(dir, "PKGBUILD"), "");

      const pkgs = await findBuiltPackages(dir);
      assert.strictEqual(pkgs.length, 2);
      assert.ok(pkgs.some((p) => p.includes("foo")));
      assert.ok(pkgs.some((p) => p.includes("bar")));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns empty for no packages", async () => {
    const dir = await mkdtemp(join(tmpdir(), "naruto-test-"));
    try {
      await writeFile(join(dir, "PKGBUILD"), "");
      const pkgs = await findBuiltPackages(dir);
      assert.strictEqual(pkgs.length, 0);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
