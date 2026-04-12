import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/core/exec.ts";
import { OutputService } from "../src/services/OutputService.ts";
import { PacmanConfService } from "../src/services/PacmanConfService.ts";
import { createServices } from "../src/services/create.ts";

describe("createServices", () => {
  it("wires output formatting from pacman-conf color policy", async () => {
    const services = await createServices();
    const colorEnabled = await new PacmanConfService(run).isColorEnabled();
    const expectedOutput = new OutputService(colorEnabled);

    assert.strictEqual(
      services.output.formatSection("Checking AUR packages..."),
      expectedOutput.formatSection("Checking AUR packages..."),
    );
    assert.strictEqual(
      services.output.formatPrompt("Proceed?"),
      expectedOutput.formatPrompt("Proceed?"),
    );
    assert.strictEqual(typeof services.ui.confirm, "function");
    assert.strictEqual(typeof services.ui.pickNumber, "function");
    assert.strictEqual(typeof services.exec.sudoPacman, "function");
    assert.strictEqual(typeof services.aur.search, "function");
    assert.strictEqual(typeof services.alpm.searchSync, "function");
  });
});
