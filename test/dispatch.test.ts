import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../src/cli.ts";
import { createFakeServices } from "./fakes/services.ts";

describe("dispatch", () => {
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

  it("routes upgrade to the upgrade command", async () => {
    const { services, exec } = createFakeServices();
    await dispatch({ op: "upgrade" }, services);
    assert.deepStrictEqual(exec.calls[0].args, ["-Syu"]);
  });

  it("routes install to the install command", async () => {
    const { services, alpm, exec } = createFakeServices();
    alpm.addSync({
      name: "firefox",
      version: "1.0-1",
      desc: "browser",
      url: "",
      arch: "x86_64",
      size: 1,
      isize: 1,
      reason: 0,
      buildDate: 0,
      packager: "",
      licenses: [],
      groups: [],
      depends: [],
      optdepends: [],
      makedepends: [],
      checkdepends: [],
      conflicts: [],
      provides: [],
      replaces: [],
      requiredBy: [],
      optionalFor: [],
      hasScriptlet: false,
    });
    await dispatch({ op: "install", packages: ["firefox"] }, services);
    assert.deepStrictEqual(exec.calls[0].args, ["-S", "--needed", "firefox"]);
  });

  it("routes search to the search command", async () => {
    const { services, alpm, output } = createFakeServices();
    alpm.addSync({
      name: "firefox",
      version: "1.0-1",
      dbName: "extra",
      desc: "browser",
      url: "",
      arch: "x86_64",
      size: 1,
      isize: 1,
      reason: 0,
      buildDate: 0,
      packager: "",
      licenses: [],
      groups: [],
      depends: [],
      optdepends: [],
      makedepends: [],
      checkdepends: [],
      conflicts: [],
      provides: [],
      replaces: [],
      requiredBy: [],
      optionalFor: [],
      hasScriptlet: false,
    });
    await dispatch({ op: "search", query: "firefox" }, services);
    assert.ok(output.calls.some((call) => call.fn === "info"));
  });

  it("routes syncInfo to the info command", async () => {
    const { services, alpm, output } = createFakeServices();
    alpm.addSync({
      name: "firefox",
      version: "1.0-1",
      dbName: "extra",
      desc: "browser",
      url: "",
      arch: "x86_64",
      size: 1,
      isize: 1,
      reason: 0,
      buildDate: 0,
      packager: "",
      licenses: [],
      groups: [],
      depends: [],
      optdepends: [],
      makedepends: [],
      checkdepends: [],
      conflicts: [],
      provides: [],
      replaces: [],
      requiredBy: [],
      optionalFor: [],
      hasScriptlet: false,
    });
    await dispatch({ op: "syncInfo", package: "firefox" }, services);
    assert.ok(output.calls.some((call) => call.fn === "info"));
  });

  it("routes queryInfo to the installed info command", async () => {
    const { services, alpm, output } = createFakeServices();
    alpm.addLocal({
      name: "firefox",
      version: "1.0-1",
      desc: "browser",
      url: "",
      arch: "x86_64",
      size: 1,
      isize: 1,
      reason: 0,
      buildDate: 0,
      packager: "",
      licenses: [],
      groups: [],
      depends: [],
      optdepends: [],
      makedepends: [],
      checkdepends: [],
      conflicts: [],
      provides: [],
      replaces: [],
      requiredBy: [],
      optionalFor: [],
      hasScriptlet: false,
    });
    await dispatch({ op: "queryInfo", package: "firefox" }, services);
    assert.ok(output.calls.some((call) => call.fn === "info"));
  });

  it("routes default to the default command", async () => {
    const { services, alpm, ui } = createFakeServices();
    alpm.addLocal({
      name: "firefox",
      version: "1.0-1",
      desc: "browser",
      url: "",
      arch: "x86_64",
      size: 1,
      isize: 1,
      reason: 0,
      buildDate: 0,
      packager: "",
      licenses: [],
      groups: [],
      depends: [],
      optdepends: [],
      makedepends: [],
      checkdepends: [],
      conflicts: [],
      provides: [],
      replaces: [],
      requiredBy: [],
      optionalFor: [],
      hasScriptlet: false,
    });
    await dispatch({ op: "default", names: ["firefox"] }, services);
    assert.ok(ui.calls.some((call) => call.fn === "confirm"));
  });
});
