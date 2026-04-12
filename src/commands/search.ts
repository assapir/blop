import type { Alpm, Aur, Output } from "../contracts/services.ts";

export async function search(
  query: string,
  { alpm, aur, output }: { alpm: Alpm; aur: Aur; output: Output },
): Promise<void> {
  const [repoResults, aurResults] = await Promise.all([
    alpm.searchSync([query]),
    aur.search(query),
  ]);

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
