import type { Exec } from "../../src/contracts/services.ts";

export class FakeExecService implements Exec {
  calls: { fn: string; args: unknown[] }[] = [];
  builtPackages: string[] = [];

  async sudoPacman(args: string[]): Promise<number> {
    this.calls.push({ fn: "sudoPacman", args });
    return 0;
  }

  async gitClone(url: string, dest: string): Promise<{ stdout: string; stderr: string }> {
    this.calls.push({ fn: "gitClone", args: [url, dest] });
    return { stdout: "", stderr: "" };
  }

  async makepkg(cwd: string, args: string[]): Promise<number> {
    this.calls.push({ fn: "makepkg", args: [cwd, args] });
    return 0;
  }

  async findBuiltPackages(cwd: string): Promise<string[]> {
    this.calls.push({ fn: "findBuiltPackages", args: [cwd] });
    return this.builtPackages;
  }
}
