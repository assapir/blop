import { install } from "./install.ts";
import { searchAll } from "./search.ts";
import type { Alpm, Aur, Exec, Output, Ui, PackageInfo } from "../contracts/services.ts";
import type { AurSearchResult } from "../core/types.ts";

export async function defaultCommand(
  names: string[],
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<void> {
  for (const name of names) {
    await handleOne(name, { alpm, aur, exec, ui, output });
  }
}

async function handleOne(
  name: string,
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<void> {
  if (await tryRemoveInstalled(name, { alpm, exec, ui, output })) return;
  if (await tryInstallFromRepo(name, { alpm, aur, exec, ui, output })) return;
  if (await tryInstallAurExact(name, { alpm, aur, exec, ui, output })) return;
  await searchAndPick(name, { alpm, aur, exec, ui, output });
}

async function tryRemoveInstalled(
  name: string,
  { alpm, exec, ui, output }: { alpm: Alpm; exec: Exec; ui: Ui; output: Output },
): Promise<boolean> {
  const pkg = alpm.getInstalledPkg(name);
  if (!pkg) return false;

  output.info(`${pkg.name} ${pkg.version} is installed`);
  if (pkg.desc) output.info(`  ${pkg.desc}`);
  if (await ui.confirm("Remove?")) {
    await exec.sudoPacman(["-Rns", name]);
  }
  return true;
}

async function tryInstallFromRepo(
  name: string,
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<boolean> {
  const pkg = alpm.findSatisfier(name);
  if (!pkg) return false;

  output.info(output.formatRepoResult(pkg));
  if (await ui.confirm("Install?")) {
    await install([name], { alpm, aur, exec, ui, output });
  }
  return true;
}

async function tryInstallAurExact(
  name: string,
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<boolean> {
  const results = await aur.info([name]);
  const pkg = results.find((p) => p.Name === name);
  if (!pkg) return false;

  output.info(output.formatAurResult(pkg));
  if (await ui.confirm("Install?")) {
    await install([name], { alpm, aur, exec, ui, output });
  }
  return true;
}

async function searchAndPick(
  name: string,
  { alpm, aur, exec, ui, output }: { alpm: Alpm; aur: Aur; exec: Exec; ui: Ui; output: Output },
): Promise<void> {
  output.section(`Searching for "${name}"...`);
  const { repoResults, aurResults } = await searchAll(name, alpm, aur);

  type PickEntry =
    | { kind: "repo"; pkg: PackageInfo }
    | { kind: "aur"; pkg: AurSearchResult };

  const entries: PickEntry[] = [
    ...repoResults.map((pkg) => ({ kind: "repo" as const, pkg })),
    ...aurResults.map((pkg) => ({ kind: "aur" as const, pkg })),
  ];

  if (entries.length === 0) {
    output.info(`No results for "${name}".`);
    return;
  }

  const display = entries.slice(0, 20);
  for (let i = 0; i < display.length; i++) {
    const entry = display[i];
    output.info(
      entry.kind === "repo"
        ? output.formatRepoResult(entry.pkg, i + 1)
        : output.formatAurResult(entry.pkg, i + 1),
    );
  }

  const pick = await ui.pickNumber(
    `Pick a package [1-${display.length}] or q to quit:`,
    display.length,
  );
  if (pick == null) return;

  const selected = display[pick - 1];
  await install([selected.kind === "repo" ? selected.pkg.name : selected.pkg.Name], { alpm, aur, exec, ui, output });
}
