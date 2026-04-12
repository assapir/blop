import { info, formatRepoResult, formatAurResult, section } from "../core/format.ts";
import { install } from "./install.ts";
import type { Alpm, Aur, Exec, Ui } from "../contracts/services.ts";

export async function defaultCommand(
  names: string[],
  alpm: Alpm,
  aur: Aur,
  exec: Exec,
  ui: Ui,
): Promise<void> {
  for (const name of names) {
    await handleOne(name, alpm, aur, exec, ui);
  }
}

async function handleOne(name: string, alpm: Alpm, aur: Aur, exec: Exec, ui: Ui): Promise<void> {
  // 1. Installed? → offer remove
  const installed = alpm.getInstalledPkg(name);
  if (installed) {
    info(`${installed.name} ${installed.version} is installed`);
    if (installed.desc) info(`  ${installed.desc}`);
    if (await ui.confirm("Remove?")) {
      await exec.sudoPacman(["-Rns", name]);
    }
    return;
  }

  // 2. In repos? → offer install
  const repoPkg = alpm.findSatisfier(name);
  if (repoPkg) {
    info(formatRepoResult(repoPkg));
    if (await ui.confirm("Install?")) {
      await install([name], alpm, aur, exec, ui);
    }
    return;
  }

  // 3. Exact match in AUR? → offer install
  const aurResults = await aur.info([name]);
  const exactMatch = aurResults.find((p) => p.Name === name);
  if (exactMatch) {
    info(formatAurResult(exactMatch));
    if (await ui.confirm("Install?")) {
      await install([name], alpm, aur, exec, ui);
    }
    return;
  }

  // 4. No exact match → search and let user pick
  section(`Searching for "${name}"...`);
  const searchResults = await aur.search(name);
  if (searchResults.length === 0) {
    info(`No results for "${name}".`);
    return;
  }

  const display = searchResults.slice(0, 20);
  for (let i = 0; i < display.length; i++) {
    console.log(formatAurResult(display[i], i + 1));
  }

  const pick = await ui.pickNumber(
    `Pick a package [1-${display.length}] or q to quit:`,
    display.length,
  );
  if (pick == null) return;

  await install([display[pick - 1].Name], alpm, aur, exec, ui);
}
