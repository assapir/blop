import { formatRepoResult, formatAurResult, info } from "../core/format.ts";
import type { Alpm, Aur } from "../contracts/services.ts";

export async function search(query: string, alpm: Alpm, aur: Aur): Promise<void> {
  const [repoResults, aurResults] = await Promise.all([
    alpm.searchSync([query]),
    aur.search(query),
  ]);

  if (repoResults.length === 0 && aurResults.length === 0) {
    info(`No results for "${query}".`);
    return;
  }

  for (const pkg of repoResults) {
    console.log(formatRepoResult(pkg));
  }
  for (const pkg of aurResults) {
    console.log(formatAurResult(pkg));
  }
}
