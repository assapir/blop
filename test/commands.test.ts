import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { search } from "../src/commands/search.ts";
import { syncInfo, queryInfo } from "../src/commands/info.ts";
import { query, querySearch } from "../src/commands/query.ts";
import { install } from "../src/commands/install.ts";
import { upgrade } from "../src/commands/upgrade.ts";
import { defaultCommand } from "../src/commands/default.ts";
import { FakeAlpmService } from "./fakes/FakeAlpmService.ts";
import { FakeAurService } from "./fakes/FakeAurService.ts";
import { FakeExecService } from "./fakes/FakeExecService.ts";
import { FakeOutputService } from "./fakes/FakeOutputService.ts";
import { FakeUiService } from "./fakes/FakeUiService.ts";
import { makePkg, makeAurPkg } from "./fakes/fixtures.ts";

let alpm: FakeAlpmService;
let aur: FakeAurService;
let exec: FakeExecService;
let output: FakeOutputService;
let ui: FakeUiService;
let cleanupDirs: string[] = [];

function resetFakes() {
  alpm = new FakeAlpmService();
  aur = new FakeAurService();
  exec = new FakeExecService();
  output = new FakeOutputService();
  ui = new FakeUiService();
}

function searchDeps() {
  return { alpm, aur, output };
}

function queryDeps() {
  return { alpm, output };
}

function installDeps() {
  return { alpm, aur, exec, ui, output };
}

function uniquePackageBase(label: string): string {
  return `naruto-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareCachedPkgbuild(packageBase: string): Promise<string> {
  const dest = join(homedir(), ".cache", "naruto", packageBase);
  await mkdir(dest, { recursive: true });
  await writeFile(join(dest, "PKGBUILD"), `pkgbase=${packageBase}\npkgname=${packageBase}\n`);
  cleanupDirs.push(dest);
  return dest;
}

afterEach(async () => {
  await Promise.all(cleanupDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  cleanupDirs = [];
});

// --- search ---

describe("search command", () => {
  beforeEach(() => resetFakes());

  it("shows repo and AUR results", async () => {
    alpm.addSync(makePkg({ name: "firefox", dbName: "extra" }));
    aur.addPackage(makeAurPkg({ Name: "firefox-nightly" }));

    await search("firefox", searchDeps());
    // No assertion on output — just verifying it doesn't throw
  });

  it("handles no results", async () => {
    await search("nonexistent_xyz", searchDeps());
  });

  it("handles repo-only results", async () => {
    alpm.addSync(makePkg({ name: "pacman", dbName: "core" }));
    await search("pacman", searchDeps());
  });

  it("handles AUR-only results", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    await search("yay", searchDeps());
  });
});

// --- info ---

describe("syncInfo command", () => {
  beforeEach(() => resetFakes());

  it("shows repo package info", async () => {
    alpm.addSync(makePkg({ name: "pacman", dbName: "core" }));
    await syncInfo("pacman", searchDeps());
  });

  it("falls back to AUR", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    await syncInfo("yay", searchDeps());
  });

  it("sets exitCode when not found", async () => {
    const original = process.exitCode;
    try {
      await syncInfo("nonexistent_xyz", searchDeps());
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
    await queryInfo("pacman", queryDeps());
  });

  it("sets exitCode when not found", async () => {
    const original = process.exitCode;
    try {
      await queryInfo("nonexistent_xyz", queryDeps());
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
    query(queryDeps());
  });

  it("handles empty package list", () => {
    query(queryDeps());
  });
});

describe("querySearch command", () => {
  beforeEach(() => resetFakes());

  it("finds matching packages", () => {
    alpm.addLocal(makePkg({ name: "firefox", desc: "A web browser" }));
    alpm.addLocal(makePkg({ name: "chromium", desc: "Another browser" }));
    querySearch("firefox", queryDeps());
  });

  it("handles no matches", () => {
    alpm.addLocal(makePkg({ name: "firefox" }));
    querySearch("nonexistent_xyz", queryDeps());
  });
});

// --- install ---

describe("install command", () => {
  beforeEach(() => resetFakes());

  it("installs repo packages via sudoPacman", async () => {
    alpm.addSync(makePkg({ name: "firefox" }));
    await install(["firefox"], installDeps());

    const pacmanCall = exec.calls.find((c) => c.fn === "sudoPacman");
    assert.ok(pacmanCall, "should call sudoPacman");
    assert.deepStrictEqual(pacmanCall.args, ["-S", "--needed", "firefox"]);
  });

  it("resolves and prompts for AUR packages", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false); // decline installation

    await install(["yay"], installDeps());

    assert.ok(
      ui.calls.some((c) => c.fn === "confirm"),
      "should prompt for confirmation",
    );
  });

  it("skips AUR install when user declines", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false);

    await install(["yay"], installDeps());

    const cloneCall = exec.calls.find((c) => c.fn === "gitClone");
    assert.strictEqual(cloneCall, undefined, "should not clone when declined");
  });

  it("separates repo and AUR packages", async () => {
    alpm.addSync(makePkg({ name: "firefox" }));
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false);

    await install(["firefox", "yay"], installDeps());

    const pacmanCall = exec.calls.find((c) => c.fn === "sudoPacman");
    assert.ok(pacmanCall, "should install repo package");
    assert.deepStrictEqual(pacmanCall.args, ["-S", "--needed", "firefox"]);
  });

  it("fails when repo pacman install fails", async () => {
    const original = process.exitCode;
    try {
      alpm.addSync(makePkg({ name: "firefox" }));
      exec.sudoPacmanResults = [1];

      await install(["firefox"], installDeps());

      assert.ok(
        output.calls.some((call) => call.fn === "fail" && call.args[0] === "pacman install failed"),
      );
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });

  it("fails when sync dependency install fails", async () => {
    const original = process.exitCode;
    try {
      alpm.addSync(makePkg({ name: "firefox" }));
      aur.addPackage(makeAurPkg({ Name: "yay", Depends: ["firefox"] }));
      ui.setConfirmAnswer(true);
      exec.sudoPacmanResults = [1];

      await install(["yay"], installDeps());

      assert.ok(
        output.calls.some(
          (call) => call.fn === "fail" && call.args[0] === "failed to install sync dependencies",
        ),
      );
      assert.strictEqual(
        exec.calls.some((call) => call.fn === "gitClone"),
        false,
      );
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });

  it("fails when a fresh clone has no PKGBUILD", async () => {
    const original = process.exitCode;
    try {
      const packageBase = uniquePackageBase("missing-pkgbuild");
      aur.addPackage(makeAurPkg({ Name: "yay", PackageBase: packageBase }));
      ui.setConfirmAnswer(true);

      await install(["yay"], installDeps());

      assert.ok(exec.calls.some((call) => call.fn === "gitClone"));
      assert.ok(
        output.calls.some((call) => call.fn === "fail" && call.args[0] === "PKGBUILD not found"),
      );
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });

  it("uses gitPull when the package base already exists in cache", async () => {
    const packageBase = uniquePackageBase("git-pull");
    await prepareCachedPkgbuild(packageBase);
    aur.addPackage(makeAurPkg({ Name: "yay", PackageBase: packageBase }));
    ui.setConfirmAnswer(true);
    exec.builtPackages = ["/tmp/yay.pkg.tar.zst"];

    await install(["yay"], installDeps());

    assert.ok(exec.calls.some((call) => call.fn === "gitPull"));
    assert.strictEqual(
      exec.calls.some((call) => call.fn === "gitClone"),
      false,
    );
  });

  it("fails when makepkg fails", async () => {
    const original = process.exitCode;
    try {
      const packageBase = uniquePackageBase("makepkg-fail");
      await prepareCachedPkgbuild(packageBase);
      aur.addPackage(makeAurPkg({ Name: "yay", PackageBase: packageBase }));
      ui.setConfirmAnswer(true);
      exec.makepkgResult = 1;

      await install(["yay"], installDeps());

      assert.ok(
        output.calls.some(
          (call) => call.fn === "fail" && call.args[0] === `makepkg failed for ${packageBase}`,
        ),
      );
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });

  it("fails when no built packages are found", async () => {
    const original = process.exitCode;
    try {
      const packageBase = uniquePackageBase("no-built-packages");
      await prepareCachedPkgbuild(packageBase);
      aur.addPackage(makeAurPkg({ Name: "yay", PackageBase: packageBase }));
      ui.setConfirmAnswer(true);

      await install(["yay"], installDeps());

      assert.ok(
        output.calls.some(
          (call) =>
            call.fn === "fail" && call.args[0] === `no built packages found for ${packageBase}`,
        ),
      );
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });

  it("fails when pacman -U fails", async () => {
    const original = process.exitCode;
    try {
      const packageBase = uniquePackageBase("pacman-u-fail");
      await prepareCachedPkgbuild(packageBase);
      aur.addPackage(makeAurPkg({ Name: "yay", PackageBase: packageBase }));
      ui.setConfirmAnswer(true);
      exec.builtPackages = ["/tmp/yay.pkg.tar.zst"];
      exec.sudoPacmanResults = [1];

      await install(["yay"], installDeps());

      assert.ok(
        output.calls.some(
          (call) => call.fn === "fail" && call.args[0] === `failed to install ${packageBase}`,
        ),
      );
      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = original;
    }
  });
});

// --- upgrade ---

describe("upgrade command", () => {
  beforeEach(() => resetFakes());

  it("runs pacman -Syu", async () => {
    await upgrade(installDeps());

    const syuCall = exec.calls.find(
      (c) => c.fn === "sudoPacman" && (c.args as string[]).includes("-Syu"),
    );
    assert.ok(syuCall, "should run -Syu");
  });

  it("reports no foreign packages", async () => {
    await upgrade(installDeps());
    // No AUR packages installed, should just do -Syu and finish
    assert.strictEqual(exec.calls.length, 1, "should only call -Syu");
  });

  it("detects outdated AUR packages", async () => {
    alpm.addLocal(makePkg({ name: "yay", version: "1.0-1" }));
    aur.addPackage(makeAurPkg({ Name: "yay", Version: "2.0-1" }));
    ui.setConfirmAnswer(false);

    await upgrade(installDeps());

    assert.ok(
      ui.calls.some((c) => c.fn === "confirm"),
      "should prompt to upgrade",
    );
  });

  it("reports all up to date", async () => {
    alpm.addLocal(makePkg({ name: "yay", version: "2.0-1" }));
    aur.addPackage(makeAurPkg({ Name: "yay", Version: "2.0-1" }));

    await upgrade(installDeps());

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

    await defaultCommand(["firefox"], installDeps());

    const confirmCall = ui.calls.find((c) => c.fn === "confirm");
    assert.ok(confirmCall, "should prompt to remove");
    assert.ok(String(confirmCall.args[0]).includes("Remove"), "prompt should mention Remove");
  });

  it("removes package when confirmed", async () => {
    alpm.addLocal(makePkg({ name: "firefox" }));
    ui.setConfirmAnswer(true);

    await defaultCommand(["firefox"], installDeps());

    const rmCall = exec.calls.find((c) => c.fn === "sudoPacman");
    assert.ok(rmCall, "should call sudoPacman");
    assert.deepStrictEqual(rmCall.args, ["-Rns", "firefox"]);
  });

  it("offers to install repo package", async () => {
    alpm.addSync(makePkg({ name: "firefox", dbName: "extra" }));
    ui.setConfirmAnswer(false);

    await defaultCommand(["firefox"], installDeps());

    const confirmCall = ui.calls.find((c) => c.fn === "confirm");
    assert.ok(confirmCall, "should prompt to install");
    assert.ok(String(confirmCall.args[0]).includes("Install"), "prompt should mention Install");
  });

  it("offers to install AUR exact match", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay" }));
    ui.setConfirmAnswer(false);

    await defaultCommand(["yay"], installDeps());

    const confirmCall = ui.calls.find((c) => c.fn === "confirm");
    assert.ok(confirmCall, "should prompt to install");
    assert.ok(String(confirmCall.args[0]).includes("Install"), "prompt should mention Install");
  });

  it("falls back to search when no exact match", async () => {
    aur.addPackage(makeAurPkg({ Name: "yay-bin" }));
    // "yay" won't exact-match "yay-bin", but search for "yay" will find it
    ui.setPickAnswer(null); // quit picker

    await defaultCommand(["yay"], installDeps());

    const pickCall = ui.calls.find((c) => c.fn === "pickNumber");
    assert.ok(pickCall, "should show picker");
  });

  it("fallback search includes repo results", async () => {
    alpm.addSync(makePkg({ name: "firefox", dbName: "extra" }));
    alpm.addSync(makePkg({ name: "firefox-developer-edition", dbName: "extra" }));
    aur.addPackage(makeAurPkg({ Name: "firefox-nightly" }));
    ui.setPickAnswer(null); // just check picker is shown, don't install

    await defaultCommand(["firef"], installDeps());

    const pickCall = ui.calls.find((c) => c.fn === "pickNumber");
    assert.ok(pickCall, "should show picker");
    // picker range should include all 3 results (2 repo + 1 AUR)
    assert.ok(String(pickCall.args[0]).includes("3"), "picker should offer all 3 results");
  });

  it("fallback search shows repo-only results when AUR has none", async () => {
    alpm.addSync(makePkg({ name: "pacman", dbName: "core" }));
    ui.setPickAnswer(null);

    await defaultCommand(["pacma"], installDeps());

    const pickCall = ui.calls.find((c) => c.fn === "pickNumber");
    assert.ok(pickCall, "should show picker for repo-only results");
  });

  it("fallback search passes index to formatter so descriptions indent correctly", async () => {
    alpm.addSync(makePkg({ name: "firefox", dbName: "extra", desc: "A web browser" }));
    aur.addPackage(makeAurPkg({ Name: "firefox-nightly", Description: "Nightly build" }));
    ui.setPickAnswer(null);

    await defaultCommand(["firef"], installDeps());

    const infoCalls = output.calls.filter((c) => c.fn === "info").map((c) => String(c.args[0]));
    // With correct index passing: description line indented with 4 spaces
    // Without (the bug): description indented with 3 spaces then number prepended
    const repoLine = infoCalls.find((s) => s.includes("firefox") && s.includes("A web browser"));
    const aurLine = infoCalls.find((s) => s.includes("firefox-nightly") && s.includes("Nightly build"));
    assert.ok(repoLine, "repo result with description should be displayed");
    assert.ok(aurLine, "AUR result with description should be displayed");
    assert.ok(repoLine!.includes("\n    "), "repo description should be indented with 4 spaces (index passed)");
    assert.ok(aurLine!.includes("\n    "), "AUR description should be indented with 4 spaces (index passed)");
  });

  it("handles no search results", async () => {
    // No packages anywhere
    await defaultCommand(["nonexistent_xyz_99"], installDeps());

    // Should not crash, no confirm or pick
    assert.strictEqual(ui.calls.length, 0);
  });

  it("installs the selected search result", async () => {
    const packageBase = uniquePackageBase("default-search-install");
    await prepareCachedPkgbuild(packageBase);
    aur.addPackage(makeAurPkg({ Name: "yay-bin", PackageBase: packageBase }));
    ui.setPickAnswer(1);
    ui.setConfirmAnswer(true);
    exec.builtPackages = ["/tmp/yay-bin.pkg.tar.zst"];

    await defaultCommand(["yay"], installDeps());

    assert.ok(ui.calls.some((call) => call.fn === "pickNumber"));
    assert.ok(exec.calls.some((call) => call.fn === "makepkg"));
    assert.ok(
      exec.calls.some(
        (call) => call.fn === "sudoPacman" && Array.isArray(call.args) && call.args[0] === "-U",
      ),
    );
  });
});
