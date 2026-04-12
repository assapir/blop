import type { Alpm, Output } from "../contracts/services.ts";

export function query({ alpm, output }: { alpm: Alpm; output: Output }): void {
  for (const pkg of alpm.getInstalledPackages()) {
    output.info(`${pkg.name} ${pkg.version}`);
  }
}

export function querySearch(
  queryStr: string,
  { alpm, output }: { alpm: Alpm; output: Output },
): void {
  const results = alpm.searchLocal([queryStr]);

  if (results.length === 0) {
    output.info(`No installed packages match "${queryStr}".`);
    return;
  }

  for (const pkg of results) {
    output.info(`${pkg.name} ${pkg.version}`);
  }
}
