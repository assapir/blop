import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../src/cli.ts";
import { createFakeServices } from "./fakes/services.ts";

describe("dispatch", () => {
  it("handles help without services", async () => {
    // Should not throw when services is undefined
    await dispatch({ op: "help" }, undefined);
  });

  it("handles error without services", async () => {
    const original = process.exitCode;
    try {
      await dispatch({ op: "error", message: "test" }, undefined);
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });

  it("throws when services missing for upgrade", async () => {
    await assert.rejects(() => dispatch({ op: "upgrade" }, undefined), /services required/);
  });

  it("routes remove to sudoPacman", async () => {
    const { services, exec } = createFakeServices();
    await dispatch({ op: "remove", flags: "-Rns", packages: ["foo"] }, services);
    assert.strictEqual(exec.calls.length, 1);
    assert.strictEqual(exec.calls[0].fn, "sudoPacman");
    assert.deepStrictEqual(exec.calls[0].args, ["-Rns", "foo"]);
  });

  it("routes passthrough to sudoPacman", async () => {
    const { services, exec } = createFakeServices();
    await dispatch({ op: "passthrough", args: ["-Sc"] }, services);
    assert.strictEqual(exec.calls[0].fn, "sudoPacman");
    assert.deepStrictEqual(exec.calls[0].args, ["-Sc"]);
  });

  it("routes refreshDb to sudoPacman -Sy", async () => {
    const { services, exec } = createFakeServices();
    await dispatch({ op: "refreshDb" }, services);
    assert.deepStrictEqual(exec.calls[0].args, ["-Sy"]);
  });

  it("routes query to alpm", async () => {
    const { services } = createFakeServices();
    // Should not throw — query just lists packages (empty for fake)
    await dispatch({ op: "query" }, services);
  });

  it("routes querySearch to alpm", async () => {
    const { services } = createFakeServices();
    await dispatch({ op: "querySearch", query: "test" }, services);
  });
});
