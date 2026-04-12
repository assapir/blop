import { execFile as execFileCb, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const execFileAsync = promisify(execFileCb);

const MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

export function run(
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(cmd, args, { cwd: opts?.cwd, maxBuffer: MAX_BUFFER });
}

export function runInteractive(
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: opts?.cwd,
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export function sudoPacman(args: string[]): Promise<number> {
  return runInteractive("sudo", ["pacman", ...args]);
}

export function gitClone(url: string, dest: string): Promise<{ stdout: string; stderr: string }> {
  return run("git", ["clone", "--depth=1", url, dest]);
}

export function gitPull(cwd: string): Promise<{ stdout: string; stderr: string }> {
  return run("git", ["pull", "--depth=1"], { cwd });
}

export function makepkg(cwd: string, args: string[]): Promise<number> {
  return runInteractive("makepkg", args, { cwd });
}

const PKG_RE = /\.pkg\.tar\.\w+$/;

export async function findBuiltPackages(cwd: string): Promise<string[]> {
  const entries = await readdir(cwd, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && PKG_RE.test(e.name)).map((e) => join(cwd, e.name));
}
