import { formatSize, formatDate, joinDeps } from "../core/format.ts";
import type { AurInfoResult } from "../core/types.ts";
import type { Alpm, Aur, Output, PackageInfo } from "../contracts/services.ts";

function formatRepoPkg(pkg: PackageInfo, output: Output): string {
  return output.formatPackageInfo([
    ["Repository", pkg.dbName ?? "unknown"],
    ["Name", pkg.name],
    ["Version", pkg.version],
    ["Description", pkg.desc ?? "None"],
    ["Architecture", pkg.arch ?? "any"],
    ["URL", pkg.url ?? "None"],
    ["Licenses", pkg.licenses.join(", ") || "None"],
    ["Groups", pkg.groups.join(", ") || "None"],
    ["Depends On", joinDeps(pkg.depends)],
    ["Optional Deps", joinDeps(pkg.optdepends)],
    ["Conflicts With", joinDeps(pkg.conflicts)],
    ["Provides", joinDeps(pkg.provides)],
    ["Replaces", joinDeps(pkg.replaces)],
    ["Download Size", formatSize(pkg.size)],
    ["Installed Size", formatSize(pkg.isize)],
  ]);
}

function formatAurPkg(pkg: AurInfoResult, output: Output): string {
  return output.formatPackageInfo([
    ["Repository", "aur"],
    ["Name", pkg.Name],
    ["Version", pkg.Version],
    ["Description", pkg.Description ?? "None"],
    ["URL", pkg.URL ?? "None"],
    ["Licenses", pkg.License.join(", ") || "None"],
    ["Depends On", pkg.Depends.join("  ") || "None"],
    ["Make Deps", pkg.MakeDepends.join("  ") || "None"],
    ["Optional Deps", pkg.OptDepends.join("  ") || "None"],
    ["Conflicts With", pkg.Conflicts.join("  ") || "None"],
    ["Provides", pkg.Provides.join("  ") || "None"],
    ["Votes", String(pkg.NumVotes)],
    ["Popularity", pkg.Popularity.toFixed(2)],
    ["Maintainer", pkg.Maintainer ?? "orphan"],
    ["Last Modified", formatDate(pkg.LastModified)],
    ["Out Of Date", pkg.OutOfDate ? formatDate(pkg.OutOfDate) : "No"],
  ]);
}

function formatInstalledPkg(pkg: PackageInfo, output: Output): string {
  const reason = pkg.reason === 0 ? "Explicitly installed" : "Installed as dependency";
  return output.formatPackageInfo([
    ["Name", pkg.name],
    ["Version", pkg.version],
    ["Description", pkg.desc ?? "None"],
    ["Architecture", pkg.arch ?? "any"],
    ["URL", pkg.url ?? "None"],
    ["Licenses", pkg.licenses.join(", ") || "None"],
    ["Groups", pkg.groups.join(", ") || "None"],
    ["Depends On", joinDeps(pkg.depends)],
    ["Optional Deps", joinDeps(pkg.optdepends)],
    ["Required By", pkg.requiredBy.join("  ") || "None"],
    ["Optional For", pkg.optionalFor.join("  ") || "None"],
    ["Conflicts With", joinDeps(pkg.conflicts)],
    ["Provides", joinDeps(pkg.provides)],
    ["Replaces", joinDeps(pkg.replaces)],
    ["Installed Size", formatSize(pkg.isize)],
    ["Install Date", pkg.installDate ? formatDate(pkg.installDate) : "Unknown"],
    ["Install Reason", reason],
  ]);
}

export async function syncInfo(
  name: string,
  { alpm, aur, output }: { alpm: Alpm; aur: Aur; output: Output },
): Promise<void> {
  const repoPkg = alpm.findSatisfier(name);
  if (repoPkg) {
    output.info(formatRepoPkg(repoPkg, output));
    return;
  }

  const aurResults = await aur.info([name]);
  const aurPkg = aurResults.find((p) => p.Name === name);
  if (aurPkg) {
    output.info(formatAurPkg(aurPkg, output));
    return;
  }

  output.fail(`package '${name}' was not found`);
}

export async function queryInfo(
  name: string,
  { alpm, output }: { alpm: Alpm; output: Output },
): Promise<void> {
  const pkg = alpm.getInstalledPkg(name);
  if (pkg) {
    output.info(formatInstalledPkg(pkg, output));
    return;
  }

  output.fail(`package '${name}' was not found`);
}
