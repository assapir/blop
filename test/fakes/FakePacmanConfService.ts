import type { PacmanConf } from "../../src/contracts/services.ts";

export class FakePacmanConfService implements PacmanConf {
  #repos: Map<string, string[]>;

  constructor(repos?: Record<string, string[]>) {
    this.#repos = new Map(
      Object.entries(repos ?? { core: ["https://mirror/core"], extra: ["https://mirror/extra"] }),
    );
  }

  async getRepoList(): Promise<string[]> {
    return [...this.#repos.keys()];
  }

  async getRepoServers(repo: string): Promise<string[]> {
    return this.#repos.get(repo) ?? [];
  }
}
