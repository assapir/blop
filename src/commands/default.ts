import { install } from "./install.ts";
import type { Alpm, Aur, Exec, Output, Ui } from "../contracts/services.ts";

export async function defaultCommand(
  names: string[],
  deps: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<void> {
  for (const name of names) {
    await handleOne(name, deps);
  }
}

async function handleOne(
  name: string,
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<void> {
  // 1. Installed? → offer remove
  const installed = alpm.getInstalledPkg(name);
  if (installed) {
    output.info(`${installed.name} ${installed.version} is installed`);
    if (installed.desc) output.info(`  ${installed.desc}`);
    if (await ui.confirm("Remove?")) {
      await exec.sudoPacman(["-Rns", name]);
    }
    return;
  }

  // 2. In repos? → offer install
  const repoPkg = alpm.findSatisfier(name);
  if (repoPkg) {
    output.info(output.formatRepoResult(repoPkg));
    if (await ui.confirm("Install?")) {
      await install([name], { alpm, aur, exec, ui, output });
    }
    return;
  }

  // 3. Exact match in AUR? → offer install
  const aurResults = await aur.info([name]);
  const exactMatch = aurResults.find((p) => p.Name === name);
  if (exactMatch) {
    output.info(output.formatAurResult(exactMatch));
    if (await ui.confirm("Install?")) {
      await install([name], { alpm, aur, exec, ui, output });
    }
    return;
  }

  // 4. No exact match → search and let user pick
  output.section(`Searching for "${name}"...`);
  const searchResults = await aur.search(name);
  if (searchResults.length === 0) {
    output.info(`No results for "${name}".`);
    return;
  }

  const display = searchResults.slice(0, 20);
  for (let i = 0; i < display.length; i++) {
    output.info(output.formatAurResult(display[i], i + 1));
  }

  const pick = await ui.pickNumber(
    `Pick a package [1-${display.length}] or q to quit:`,
    display.length,
  );
  if (pick == null) return;

  await install([display[pick - 1].Name], { alpm, aur, exec, ui, output });
}
