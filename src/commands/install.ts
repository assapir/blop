import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolve } from "../core/resolver.ts";
import { section, fail, info } from "../core/format.ts";
import type { Alpm, Aur, Exec, Ui } from "../contracts/services.ts";

const CACHE_DIR = join(homedir(), ".cache", "blop");

export async function install(
  packages: string[],
  alpm: Alpm,
  aur: Aur,
  exec: Exec,
  ui: Ui,
): Promise<void> {
  const repoPackages: string[] = [];
  const aurNames: string[] = [];

  for (const name of packages) {
    if (alpm.findSatisfier(name)) {
      repoPackages.push(name);
    } else {
      aurNames.push(name);
    }
  }

  if (repoPackages.length > 0) {
    section(`Installing from repos: ${repoPackages.join(", ")}`);
    const code = await exec.sudoPacman(["-S", "--needed", ...repoPackages]);
    if (code !== 0) {
      fail("pacman install failed");
      return;
    }
  }

  if (aurNames.length === 0) return;

  section("Resolving AUR dependencies...");
  const plan = await resolve(aurNames, alpm, aur);

  if (plan.syncPackages.length > 0) {
    info(`\nSync dependencies: ${plan.syncPackages.join(", ")}`);
  }
  info(`\nAUR packages (build order):`);
  for (const pkg of plan.aurPackages) {
    info(`  ${pkg.name} ${pkg.version}`);
  }

  if (!(await ui.confirm("Proceed with installation?"))) return;

  if (plan.syncPackages.length > 0) {
    section("Installing sync dependencies...");
    const code = await exec.sudoPacman(["-S", "--needed", ...plan.syncPackages]);
    if (code !== 0) {
      fail("failed to install sync dependencies");
      return;
    }
  }

  for (const pkg of plan.aurPackages) {
    await buildAndInstall(pkg.packageBase, exec, ui);
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function buildAndInstall(packageBase: string, exec: Exec, ui: Ui): Promise<void> {
  const dest = join(CACHE_DIR, packageBase);
  const url = `https://aur.archlinux.org/${packageBase}.git`;

  section(`Building ${packageBase}...`);

  if (await dirExists(dest)) {
    info(`Using existing clone at ${dest}`);
  } else {
    await exec.gitClone(url, dest);
  }

  try {
    const pkgbuild = await readFile(join(dest, "PKGBUILD"), "utf-8");
    info("\n--- PKGBUILD ---");
    info(pkgbuild);
    info("--- end PKGBUILD ---\n");
  } catch {
    fail("PKGBUILD not found");
    return;
  }

  if (!(await ui.confirm("Continue with build?"))) return;

  const buildCode = await exec.makepkg(dest, ["-src"]);
  if (buildCode !== 0) {
    fail(`makepkg failed for ${packageBase}`);
    return;
  }

  const pkgFiles = await exec.findBuiltPackages(dest);
  if (pkgFiles.length === 0) {
    fail(`no built packages found for ${packageBase}`);
    return;
  }

  const installCode = await exec.sudoPacman(["-U", ...pkgFiles]);
  if (installCode !== 0) {
    fail(`failed to install ${packageBase}`);
  }
}
