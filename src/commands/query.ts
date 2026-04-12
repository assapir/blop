import { info } from "../core/format.ts";
import type { Alpm } from "../contracts/services.ts";

export function query(alpm: Alpm): void {
  for (const pkg of alpm.getInstalledPackages()) {
    console.log(`${pkg.name} ${pkg.version}`);
  }
}

export function querySearch(queryStr: string, alpm: Alpm): void {
  const results = alpm.searchLocal([queryStr]);

  if (results.length === 0) {
    info(`No installed packages match "${queryStr}".`);
    return;
  }

  for (const pkg of results) {
    console.log(`${pkg.name} ${pkg.version}`);
  }
}
