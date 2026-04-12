import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OutputService } from "../src/services/OutputService.ts";
import { createUi } from "../src/services/UiService.ts";

function fakeInput(text: string) {
  const input = new PassThrough();
  const output = new PassThrough();
  input.end(text + "\n");
  return { input, output };
}

describe("confirm", () => {
  it("returns true for 'y'", async () => {
    const result = await createUi(new OutputService(false), fakeInput("y")).confirm("proceed?");
    assert.strictEqual(result, true);
  });

  it("returns true for 'Y'", async () => {
    const result = await createUi(new OutputService(false), fakeInput("Y")).confirm("proceed?");
    assert.strictEqual(result, true);
  });

  it("returns false for 'n'", async () => {
    const result = await createUi(new OutputService(false), fakeInput("n")).confirm("proceed?");
    assert.strictEqual(result, false);
  });

  it("returns false for empty input", async () => {
    const result = await createUi(new OutputService(false), fakeInput("")).confirm("proceed?");
    assert.strictEqual(result, false);
  });

  it("returns false for 'yes'", async () => {
    const result = await createUi(new OutputService(false), fakeInput("yes")).confirm("proceed?");
    assert.strictEqual(result, false);
  });
});

describe("pickNumber", () => {
  it("returns number for valid input", async () => {
    const result = await createUi(new OutputService(false), fakeInput("3")).pickNumber("pick:", 5);
    assert.strictEqual(result, 3);
  });

  it("returns 1 for min boundary", async () => {
    const result = await createUi(new OutputService(false), fakeInput("1")).pickNumber("pick:", 5);
    assert.strictEqual(result, 1);
  });

  it("returns max for max boundary", async () => {
    const result = await createUi(new OutputService(false), fakeInput("5")).pickNumber("pick:", 5);
    assert.strictEqual(result, 5);
  });

  it("returns null for 'q'", async () => {
    const result = await createUi(new OutputService(false), fakeInput("q")).pickNumber("pick:", 5);
    assert.strictEqual(result, null);
  });

  it("returns null for empty input", async () => {
    const result = await createUi(new OutputService(false), fakeInput("")).pickNumber("pick:", 5);
    assert.strictEqual(result, null);
  });

  it("returns null for out of range (0)", async () => {
    const result = await createUi(new OutputService(false), fakeInput("0")).pickNumber("pick:", 5);
    assert.strictEqual(result, null);
  });

  it("returns null for out of range (above max)", async () => {
    const result = await createUi(new OutputService(false), fakeInput("6")).pickNumber("pick:", 5);
    assert.strictEqual(result, null);
  });

  it("returns null for non-numeric input", async () => {
    const result = await createUi(new OutputService(false), fakeInput("abc")).pickNumber(
      "pick:",
      5,
    );
    assert.strictEqual(result, null);
  });
});
