import { readFile, stat, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolve } from "../core/resolver.ts";
import type { Alpm, Aur, Exec, Output, Ui } from "../contracts/services.ts";

const CACHE_DIR = join(homedir(), ".cache", "naruto");

export async function install(
  packages: string[],
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
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
    output.section(`Installing from repos: ${repoPackages.join(", ")}`);
    const code = await exec.sudoPacman(["-S", "--needed", ...repoPackages]);
    if (code !== 0) {
      output.fail("pacman install failed");
      return;
    }
  }

  if (aurNames.length === 0) return;

  output.section("Resolving AUR dependencies...");
  const plan = await resolve(aurNames, alpm, aur);

  if (plan.syncPackages.length > 0) {
    output.info(`\nSync dependencies: ${plan.syncPackages.join(", ")}`);
  }
  output.info(`\nAUR packages (build order):`);
  for (const pkg of plan.aurPackages) {
    output.info(`  ${pkg.name} ${pkg.version}`);
  }

  if (!(await ui.confirm("Proceed with installation?"))) return;

  if (plan.syncPackages.length > 0) {
    output.section("Installing sync dependencies...");
    const code = await exec.sudoPacman(["-S", "--needed", ...plan.syncPackages]);
    if (code !== 0) {
      output.fail("failed to install sync dependencies");
      return;
    }
  }

  for (const pkg of plan.aurPackages) {
    await buildAndInstall(pkg.packageBase, { exec, ui, output });
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

async function buildAndInstall(
  packageBase: string,
  { exec, ui, output }: { exec: Exec; ui: Ui; output: Output },
): Promise<void> {
  const dest = join(CACHE_DIR, packageBase);
  const url = `https://aur.archlinux.org/${packageBase}.git`;

  output.section(`Building ${packageBase}...`);

  await mkdir(CACHE_DIR, { recursive: true });

  if (await dirExists(dest)) {
    output.info(`Updating existing clone at ${dest}`);
    await exec.gitPull(dest);
  } else {
    await exec.gitClone(url, dest);
  }

  try {
    const pkgbuild = await readFile(join(dest, "PKGBUILD"), "utf-8");
    output.info("\n--- PKGBUILD ---");
    output.info(pkgbuild);
    output.info("--- end PKGBUILD ---\n");
  } catch {
    output.fail("PKGBUILD not found");
    return;
  }

  if (!(await ui.confirm("Continue with build?"))) return;

  const buildCode = await exec.makepkg(dest, ["-src"]);
  if (buildCode !== 0) {
    output.fail(`makepkg failed for ${packageBase}`);
    return;
  }

  const pkgFiles = await exec.findBuiltPackages(dest);
  if (pkgFiles.length === 0) {
    output.fail(`no built packages found for ${packageBase}`);
    return;
  }

  const installCode = await exec.sudoPacman(["-U", ...pkgFiles]);
  if (installCode !== 0) {
    output.fail(`failed to install ${packageBase}`);
  }
}
