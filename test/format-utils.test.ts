import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatSize,
  formatDate,
  joinDeps,
  fail,
  formatRepoResult,
  confirm,
  pickNumber,
} from "../src/core/format.ts";
import { makePkg } from "./fakes/fixtures.ts";

function fakeInput(text: string) {
  const input = new PassThrough();
  const output = new PassThrough();
  input.end(text + "\n");
  return { input, output };
}

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

describe("confirm", () => {
  it("returns true for 'y'", async () => {
    const result = await confirm("proceed?", fakeInput("y"));
    assert.strictEqual(result, true);
  });

  it("returns true for 'Y'", async () => {
    const result = await confirm("proceed?", fakeInput("Y"));
    assert.strictEqual(result, true);
  });

  it("returns true for 'yes'", async () => {
    const result = await confirm("proceed?", fakeInput("yes"));
    assert.strictEqual(result, true);
  });

  it("returns false for 'n'", async () => {
    const result = await confirm("proceed?", fakeInput("n"));
    assert.strictEqual(result, false);
  });

  it("returns false for 'no'", async () => {
    const result = await confirm("proceed?", fakeInput("no"));
    assert.strictEqual(result, false);
  });

  it("returns true for empty input", async () => {
    const result = await confirm("proceed?", fakeInput(""));
    assert.strictEqual(result, true);
  });

  it("returns false for unrecognized input", async () => {
    const result = await confirm("proceed?", fakeInput("maybe"));
    assert.strictEqual(result, false);
  });

  it("shows the default-yes prompt hint", async () => {
    const io = fakeInput("y");
    await confirm("proceed?", io);
    const output = String(io.output.read() ?? "");
    assert.ok(output.includes("(Y/n)"), "should show the default-yes hint");
  });
});

describe("pickNumber", () => {
  it("returns number for valid input", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("3"));
    assert.strictEqual(result, 3);
  });

  it("returns 1 for min boundary", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("1"));
    assert.strictEqual(result, 1);
  });

  it("returns max for max boundary", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("5"));
    assert.strictEqual(result, 5);
  });

  it("returns null for 'q'", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("q"));
    assert.strictEqual(result, null);
  });

  it("returns null for empty input", async () => {
    const result = await pickNumber("pick:", 5, fakeInput(""));
    assert.strictEqual(result, null);
  });

  it("returns null for out of range (0)", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("0"));
    assert.strictEqual(result, null);
  });

  it("returns null for out of range (above max)", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("6"));
    assert.strictEqual(result, null);
  });

  it("returns null for non-numeric input", async () => {
    const result = await pickNumber("pick:", 5, fakeInput("abc"));
    assert.strictEqual(result, null);
  });
});
