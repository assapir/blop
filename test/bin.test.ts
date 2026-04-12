import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testDir, "..");
const binPath = join(projectRoot, "src", "bin.ts");

function runBin(args: string[], envOverrides?: NodeJS.ProcessEnv) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [binPath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, ...envOverrides },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

describe("bin", () => {
  it("prints help without initializing services", async () => {
    const result = await runBin(["--help"], { PATH: "/nonexistent" });
    assert.strictEqual(result.code, 0);
    assert.match(result.stdout, /Usage: naruto/);
    assert.strictEqual(result.stderr, "");
  });

  it("prints parse errors without initializing services", async () => {
    const result = await runBin(["-S"], { PATH: "/nonexistent" });
    assert.strictEqual(result.code, 1);
    assert.match(result.stderr, /error: no targets specified/);
    assert.strictEqual(result.stdout, "");
  });

  it("surfaces initialization failures through the top-level catch", async () => {
    const result = await runBin([], { PATH: "/nonexistent" });
    assert.strictEqual(result.code, 1);
    assert.ok(
      result.stderr.includes("pacman-conf") || result.stderr.includes("ENOENT"),
      `unexpected stderr: ${result.stderr}`,
    );
  });
});
