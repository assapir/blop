import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCommand } from "../src/cli.ts";

describe("parseCommand", () => {
  it("no args → upgrade", () => {
    assert.deepStrictEqual(parseCommand([]), { op: "upgrade" });
  });

  it("bare name → default", () => {
    assert.deepStrictEqual(parseCommand(["firefox"]), {
      op: "default",
      names: ["firefox"],
    });
  });

  it("multiple bare names → default with all names", () => {
    assert.deepStrictEqual(parseCommand(["firefox", "chromium"]), {
      op: "default",
      names: ["firefox", "chromium"],
    });
  });

  it("--help → help", () => {
    assert.deepStrictEqual(parseCommand(["--help"]), { op: "help" });
  });

  it("-Syu → upgrade", () => {
    assert.deepStrictEqual(parseCommand(["-Syu"]), { op: "upgrade" });
  });

  it("-S -y -u → upgrade", () => {
    assert.deepStrictEqual(parseCommand(["-S", "-y", "-u"]), { op: "upgrade" });
  });

  it("-Ss firefox → search", () => {
    assert.deepStrictEqual(parseCommand(["-Ss", "firefox"]), {
      op: "search",
      query: "firefox",
    });
  });

  it("-Ss without query → error", () => {
    assert.deepStrictEqual(parseCommand(["-Ss"]), {
      op: "error",
      message: "no search query specified",
    });
  });

  it("-Si pacman → syncInfo", () => {
    assert.deepStrictEqual(parseCommand(["-Si", "pacman"]), {
      op: "syncInfo",
      package: "pacman",
    });
  });

  it("-Si without package → error", () => {
    assert.deepStrictEqual(parseCommand(["-Si"]), {
      op: "error",
      message: "no package specified",
    });
  });

  it("-Sy → refreshDb", () => {
    assert.deepStrictEqual(parseCommand(["-Sy"]), { op: "refreshDb" });
  });

  it("-S firefox → install", () => {
    assert.deepStrictEqual(parseCommand(["-S", "firefox"]), {
      op: "install",
      packages: ["firefox"],
    });
  });

  it("-S multiple packages → install all", () => {
    assert.deepStrictEqual(parseCommand(["-S", "firefox", "chromium"]), {
      op: "install",
      packages: ["firefox", "chromium"],
    });
  });

  it("-S without packages → error", () => {
    assert.deepStrictEqual(parseCommand(["-S"]), {
      op: "error",
      message: "no targets specified",
    });
  });

  it("-Q → query", () => {
    assert.deepStrictEqual(parseCommand(["-Q"]), { op: "query" });
  });

  it("-Qs firefox → querySearch", () => {
    assert.deepStrictEqual(parseCommand(["-Qs", "firefox"]), {
      op: "querySearch",
      query: "firefox",
    });
  });

  it("-Qs without query → error", () => {
    assert.deepStrictEqual(parseCommand(["-Qs"]), {
      op: "error",
      message: "no search query specified",
    });
  });

  it("-Qi pacman → queryInfo", () => {
    assert.deepStrictEqual(parseCommand(["-Qi", "pacman"]), {
      op: "queryInfo",
      package: "pacman",
    });
  });

  it("-Qi without package → error", () => {
    assert.deepStrictEqual(parseCommand(["-Qi"]), {
      op: "error",
      message: "no package specified",
    });
  });

  it("-R firefox → remove", () => {
    assert.deepStrictEqual(parseCommand(["-R", "firefox"]), {
      op: "remove",
      flags: "-R",
      packages: ["firefox"],
    });
  });

  it("-Rs firefox → remove with -Rs", () => {
    assert.deepStrictEqual(parseCommand(["-Rs", "firefox"]), {
      op: "remove",
      flags: "-Rs",
      packages: ["firefox"],
    });
  });

  it("-Rns firefox → remove with -Rns", () => {
    assert.deepStrictEqual(parseCommand(["-Rns", "firefox"]), {
      op: "remove",
      flags: "-Rns",
      packages: ["firefox"],
    });
  });

  it("-R without packages → error", () => {
    assert.deepStrictEqual(parseCommand(["-R"]), {
      op: "error",
      message: "no targets specified",
    });
  });

  it("unknown flags → passthrough", () => {
    assert.deepStrictEqual(parseCommand(["-Sc"]), {
      op: "passthrough",
      args: ["-Sc"],
    });
  });

  // Long flag names
  it("--sync --search firefox → search", () => {
    assert.deepStrictEqual(parseCommand(["--sync", "--search", "firefox"]), {
      op: "search",
      query: "firefox",
    });
  });

  it("--sync --info pacman → syncInfo", () => {
    assert.deepStrictEqual(parseCommand(["--sync", "--info", "pacman"]), {
      op: "syncInfo",
      package: "pacman",
    });
  });

  it("--sync --refresh --upgrades → upgrade", () => {
    assert.deepStrictEqual(parseCommand(["--sync", "--refresh", "--upgrades"]), {
      op: "upgrade",
    });
  });

  it("--sync --refresh → refreshDb", () => {
    assert.deepStrictEqual(parseCommand(["--sync", "--refresh"]), { op: "refreshDb" });
  });

  it("--sync firefox → install", () => {
    assert.deepStrictEqual(parseCommand(["--sync", "firefox"]), {
      op: "install",
      packages: ["firefox"],
    });
  });

  it("--query → query", () => {
    assert.deepStrictEqual(parseCommand(["--query"]), { op: "query" });
  });

  it("--query --search firefox → querySearch", () => {
    assert.deepStrictEqual(parseCommand(["--query", "--search", "firefox"]), {
      op: "querySearch",
      query: "firefox",
    });
  });

  it("--query --info pacman → queryInfo", () => {
    assert.deepStrictEqual(parseCommand(["--query", "--info", "pacman"]), {
      op: "queryInfo",
      package: "pacman",
    });
  });

  it("--remove firefox → remove", () => {
    assert.deepStrictEqual(parseCommand(["--remove", "firefox"]), {
      op: "remove",
      flags: "-R",
      packages: ["firefox"],
    });
  });

  it("--remove --nosave --search firefox → remove -Rns", () => {
    assert.deepStrictEqual(parseCommand(["--remove", "--nosave", "--search", "firefox"]), {
      op: "remove",
      flags: "-Rns",
      packages: ["firefox"],
    });
  });
});
