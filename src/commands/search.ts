import type { Alpm, Aur, Output, PackageInfo } from "../contracts/services.ts";
import type { AurSearchResult } from "../core/types.ts";

export type SearchResults = {
  repoResults: PackageInfo[];
  aurResults: AurSearchResult[];
};

export async function searchAll(
  query: string,
  alpm: Alpm,
  aur: Aur,
): Promise<SearchResults> {
  const [repoResults, aurResults] = await Promise.all([
    alpm.searchSync([query]),
    aur.search(query),
  ]);
  return { repoResults, aurResults };
}

export async function search(
  query: string,
  { alpm, aur, output }: { alpm: Alpm; aur: Aur; output: Output },
): Promise<void> {
  const { repoResults, aurResults } = await searchAll(query, alpm, aur);

  if (repoResults.length === 0 && aurResults.length === 0) {
    output.info(`No results for "${query}".`);
    return;
  }

  for (const pkg of repoResults) {
    output.info(output.formatRepoResult(pkg));
  }
  for (const pkg of aurResults) {
    output.info(output.formatAurResult(pkg));
  }
}
