import type { PacmanConf } from "../contracts/services.ts";

type RunFn = (cmd: string, args: string[]) => Promise<{ stdout: string }>;

export class PacmanConfService implements PacmanConf {
  #run: RunFn;

  constructor(run: RunFn) {
    this.#run = run;
  }

  async getRepoList(): Promise<string[]> {
    const { stdout } = await this.#run("pacman-conf", ["--repo-list"]);
    return stdout.split("\n").filter(Boolean);
  }

  async getRepoServers(repo: string): Promise<string[]> {
    const { stdout } = await this.#run("pacman-conf", ["--repo", repo, "Server"]);
    return stdout.split("\n").filter(Boolean);
  }
}
