import { install } from "./install.ts";
import type { Alpm, Aur, Exec, Output, Ui } from "../contracts/services.ts";

export async function upgrade({
  alpm,
  aur,
  exec,
  ui,
  output,
}: {
  alpm: Alpm;
  aur: Aur;
  exec: Exec;
  ui: Ui;
  output: Output;
}): Promise<void> {
  // Official repos
  output.section("Upgrading official packages...");
  const code = await exec.sudoPacman(["-Syu"]);
  if (code !== 0) {
    output.fail("pacman upgrade failed");
    return;
  }

  // AUR packages
  output.section("Checking AUR packages...");
  const foreign = alpm.getForeignPackages();
  if (foreign.length === 0) {
    output.info("No foreign (AUR) packages installed.");
    return;
  }

  const foreignNames = foreign.map((p) => p.name);
  const aurInfoResults = await aur.info(foreignNames);

  const aurMap = new Map(aurInfoResults.map((p) => [p.Name, p]));
  const outdated: { name: string; oldVer: string; newVer: string }[] = [];

  for (const pkg of foreign) {
    const aurPkg = aurMap.get(pkg.name);
    if (!aurPkg) continue;
    if (alpm.vercmp(pkg.version, aurPkg.Version) < 0) {
      outdated.push({ name: pkg.name, oldVer: pkg.version, newVer: aurPkg.Version });
    }
  }

  if (outdated.length === 0) {
    output.info("All AUR packages are up to date.");
    return;
  }

  output.info("");
  for (const pkg of outdated) {
    output.info(`  ${pkg.name} ${pkg.oldVer} → ${pkg.newVer}`);
  }
  output.info("");

  if (!(await ui.confirm(`Upgrade ${outdated.length} AUR package(s)?`))) return;

  await install(
    outdated.map((p) => p.name),
    { alpm, aur, exec, ui, output },
  );
}
