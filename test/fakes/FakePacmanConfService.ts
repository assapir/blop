import type { PacmanConf } from "../../src/contracts/services.ts";

export class FakePacmanConfService implements PacmanConf {
  #repos: Map<string, string[]>;
  #colorEnabled: boolean;

  constructor(repos?: Record<string, string[]>, colorEnabled = true) {
    this.#repos = new Map(
      Object.entries(repos ?? { core: ["https://mirror/core"], extra: ["https://mirror/extra"] }),
    );
    this.#colorEnabled = colorEnabled;
  }

  async getRepoList(): Promise<string[]> {
    return [...this.#repos.keys()];
  }

  async getRepoServers(repo: string): Promise<string[]> {
    return this.#repos.get(repo) ?? [];
  }

  async isColorEnabled(): Promise<boolean> {
    return this.#colorEnabled;
  }
}
