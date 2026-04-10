import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDepName } from "../src/core/types.ts";

describe("parseDepName", () => {
  it("strips >= constraint", () => {
    assert.strictEqual(parseDepName("foo>=1.0"), "foo");
  });

  it("strips <= constraint", () => {
    assert.strictEqual(parseDepName("foo<=2.0"), "foo");
  });

  it("strips > constraint", () => {
    assert.strictEqual(parseDepName("foo>1.0"), "foo");
  });

  it("strips < constraint", () => {
    assert.strictEqual(parseDepName("foo<2.0"), "foo");
  });

  it("strips = constraint", () => {
    assert.strictEqual(parseDepName("foo=1.0"), "foo");
  });

  it("returns bare name unchanged", () => {
    assert.strictEqual(parseDepName("foo"), "foo");
  });

  it("handles lib32 prefix", () => {
    assert.strictEqual(parseDepName("lib32-foo>=1.0"), "lib32-foo");
  });

  it("handles .so deps", () => {
    assert.strictEqual(parseDepName("libfoo.so=42-64"), "libfoo.so");
  });
});
