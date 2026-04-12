import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { search } from "../src/commands/search.ts";
import { syncInfo, queryInfo } from "../src/commands/info.ts";
import { query, querySearch } from "../src/commands/query.ts";
import { install } from "../src/commands/install.ts";
import { upgrade } from "../src/commands/upgrade.ts";
import { defaultCommand } from "../src/commands/default.ts";
import { FakeAlpmService } from "./fakes/FakeAlpmService.ts";
import { FakeAurService } from "./fakes/FakeAurService.ts";
import { FakeExecService } from "./fakes/FakeExecService.ts";
import { FakeUiService } from "./fakes/FakeUiService.ts";
import { makePkg, makeAurPkg } from "./fakes/fixtures.ts";

let alpm: FakeAlpmService;
let aur: FakeAurService;
let exec: FakeExecService;
let ui: FakeUiService;

function resetFakes() {
  alpm = new FakeAlpmService();
  aur = new FakeAurService();
  exec = new FakeExecService();
  ui = new FakeUiService();
}

// --- search ---

describe("search command", () => {
  beforeEach(() => resetFakes());

  it("shows repo and AUR results", async () => {
    alpm.addSync(makePkg({ name: "firefox", dbName: "extra" }));
    aur.addPackage(makeAurPkg({ Name: "firefox-nightly" }));

    await search("firefox", alpm, aur);
    // No assertion on output — just verifying it doesn't throw
  });

  it("handles no results", async () => {
    await search("nonexistent_xyz", alpm, aur);
  });

  it("handles repo-only results", async () => {
    alpm.addSync(makePkg({ name: "pacman", dbName: "core" }));
    await search("pacman", alpm, aur);
  });

  it("handles AUR-only results", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    await search("yay", alpm, aur);
  });
});

// --- info ---

describe("syncInfo command", () => {
  beforeEach(() => resetFakes());

  it("shows repo package info", async () => {
    alpm.addSync(makePkg({ name: "pacman", dbName: "core" }));
    await syncInfo("pacman", alpm, aur);
  });

  it("falls back to AUR", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    await syncInfo("yay", alpm, aur);
  });

  it("sets exitCode when not found", async () => {
    const original = process.exitCode;
    try {
      await syncInfo("nonexistent_xyz", alpm, aur);
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });
});

describe("queryInfo command", () => {
  beforeEach(() => resetFakes());

  it("shows installed package info", async () => {
    alpm.addLocal(makePkg({ name: "pacman" }));
    await queryInfo("pacman", alpm);
  });

  it("sets exitCode when not found", async () => {
    const original = process.exitCode;
    try {
      await queryInfo("nonexistent_xyz", alpm);
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });
});

// --- query ---

describe("query command", () => {
  beforeEach(() => resetFakes());

  it("lists installed packages", () => {
    alpm.addLocal(makePkg({ name: "foo", version: "1.0-1" }));
    alpm.addLocal(makePkg({ name: "bar", version: "2.0-1" }));
    query(alpm);
  });

  it("handles empty package list", () => {
    query(alpm);
  });
});

describe("querySearch command", () => {
  beforeEach(() => resetFakes());

  it("finds matching packages", () => {
    alpm.addLocal(makePkg({ name: "firefox", desc: "A web browser" }));
    alpm.addLocal(makePkg({ name: "chromium", desc: "Another browser" }));
    querySearch("firefox", alpm);
  });

  it("handles no matches", () => {
    alpm.addLocal(makePkg({ name: "firefox" }));
    querySearch("nonexistent_xyz", alpm);
  });
});

// --- install ---

describe("install command", () => {
  beforeEach(() => resetFakes());

  it("installs repo packages via sudoPacman", async () => {
    alpm.addSync(makePkg({ name: "firefox" }));
    await install(["firefox"], alpm, aur, exec, ui);

    const pacmanCall = exec.calls.find((c) => c.fn === "sudoPacman");
    assert.ok(pacmanCall, "should call sudoPacman");
    assert.deepStrictEqual(pacmanCall.args, ["-S", "--needed", "firefox"]);
  });

  it("resolves and prompts for AUR packages", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false); // decline installation

    await install(["yay"], alpm, aur, exec, ui);

    assert.ok(
      ui.calls.some((c) => c.fn === "confirm"),
      "should prompt for confirmation",
    );
  });

  it("skips AUR install when user declines", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false);

    await install(["yay"], alpm, aur, exec, ui);

    const cloneCall = exec.calls.find((c) => c.fn === "gitClone");
    assert.strictEqual(cloneCall, undefined, "should not clone when declined");
  });

  it("separates repo and AUR packages", async () => {
    alpm.addSync(makePkg({ name: "firefox" }));
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false);

    await install(["firefox", "yay"], alpm, aur, exec, ui);

    const pacmanCall = exec.calls.find((c) => c.fn === "sudoPacman");
    assert.ok(pacmanCall, "should install repo package");
    assert.deepStrictEqual(pacmanCall.args, ["-S", "--needed", "firefox"]);
  });
});

// --- upgrade ---

describe("upgrade command", () => {
  beforeEach(() => resetFakes());

  it("runs pacman -Syu", async () => {
    await upgrade(alpm, aur, exec, ui);

    const syuCall = exec.calls.find(
      (c) => c.fn === "sudoPacman" && (c.args as string[]).includes("-Syu"),
    );
    assert.ok(syuCall, "should run -Syu");
  });

  it("reports no foreign packages", async () => {
    await upgrade(alpm, aur, exec, ui);
    // No AUR packages installed, should just do -Syu and finish
    assert.strictEqual(exec.calls.length, 1, "should only call -Syu");
  });

  it("detects outdated AUR packages", async () => {
    alpm.addLocal(makePkg({ name: "yay", version: "1.0-1" }));
    aur.addPackage(makeAurPkg({ Name: "yay", Version: "2.0-1" }));
    ui.setConfirmAnswer(false);

    await upgrade(alpm, aur, exec, ui);

    assert.ok(
      ui.calls.some((c) => c.fn === "confirm"),
      "should prompt to upgrade",
    );
  });

  it("reports all up to date", async () => {
    alpm.addLocal(makePkg({ name: "yay", version: "2.0-1" }));
    aur.addPackage(makeAurPkg({ Name: "yay", Version: "2.0-1" }));

    await upgrade(alpm, aur, exec, ui);

    assert.strictEqual(
      ui.calls.filter((c) => c.fn === "confirm").length,
      0,
      "should not prompt when up to date",
    );
  });
});

// --- default ---

describe("defaultCommand", () => {
  beforeEach(() => resetFakes());

  it("offers to remove installed package", async () => {
    alpm.addLocal(makePkg({ name: "firefox" }));
    ui.setConfirmAnswer(false);

    await defaultCommand(["firefox"], alpm, aur, exec, ui);

    const confirmCall = ui.calls.find((c) => c.fn === "confirm");
    assert.ok(confirmCall, "should prompt to remove");
    assert.ok(String(confirmCall.args[0]).includes("Remove"), "prompt should mention Remove");
  });

  it("removes package when confirmed", async () => {
    alpm.addLocal(makePkg({ name: "firefox" }));
    ui.setConfirmAnswer(true);

    await defaultCommand(["firefox"], alpm, aur, exec, ui);

    const rmCall = exec.calls.find((c) => c.fn === "sudoPacman");
    assert.ok(rmCall, "should call sudoPacman");
    assert.deepStrictEqual(rmCall.args, ["-Rns", "firefox"]);
  });

  it("offers to install repo package", async () => {
    alpm.addSync(makePkg({ name: "firefox", dbName: "extra" }));
    ui.setConfirmAnswer(false);

    await defaultCommand(["firefox"], alpm, aur, exec, ui);

    const confirmCall = ui.calls.find((c) => c.fn === "confirm");
    assert.ok(confirmCall, "should prompt to install");
    assert.ok(String(confirmCall.args[0]).includes("Install"), "prompt should mention Install");
  });

  it("offers to install AUR exact match", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false);

    await defaultCommand(["yay"], alpm, aur, exec, ui);

    const confirmCall = ui.calls.find((c) => c.fn === "confirm");
    assert.ok(confirmCall, "should prompt to install");
    assert.ok(String(confirmCall.args[0]).includes("Install"), "prompt should mention Install");
  });

  it("falls back to search when no exact match", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay-bin" }));
    // "yay" won't exact-match "yay-bin", but search for "yay" will find it
    ui.setPickAnswer(null); // quit picker

    await defaultCommand(["yay"], alpm, aur, exec, ui);

    const pickCall = ui.calls.find((c) => c.fn === "pickNumber");
    assert.ok(pickCall, "should show picker");
  });

  it("handles no search results", async () => {
    // No packages anywhere
    await defaultCommand(["nonexistent_xyz_99"], alpm, aur, exec, ui);

    // Should not crash, no confirm or pick
    assert.strictEqual(ui.calls.length, 0);
  });
});
