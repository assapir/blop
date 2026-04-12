import type { PackageInfo } from "libalpm";
import type { AurSearchResult, AurInfoResult } from "../core/types.ts";

export type { PackageInfo };

/** Only used during AlpmService init, not by commands. */
export type PacmanConf = {
  getRepoList(): Promise<string[]>;
  getRepoServers(repo: string): Promise<string[]>;
  isColorEnabled(): Promise<boolean>;
};

export type Alpm = {
  isInstalled(name: string): boolean;
  getInstalledPkg(name: string): PackageInfo | null;
  getInstalledPackages(): PackageInfo[];
  getForeignPackages(): PackageInfo[];
  findSatisfier(depstring: string): PackageInfo | null;
  findSatisfierLocal(depstring: string): PackageInfo | null;
  searchSync(queries: string[]): PackageInfo[];
  searchLocal(queries: string[]): PackageInfo[];
  vercmp(a: string, b: string): number;
};

export type Aur = {
  search(query: string): Promise<AurSearchResult[]>;
  info(names: string[]): Promise<AurInfoResult[]>;
};

export type Output = {
  formatRepoResult(pkg: PackageInfo, index?: number): string;
  formatAurResult(pkg: AurSearchResult, index?: number): string;
  formatPackageInfo(fields: [string, string][]): string;
  formatPrompt(message: string): string;
  formatSection(message: string): string;
  info(message: string): void;
  error(message: string): void;
  fail(message: string): void;
  section(message: string): void;
};

export type Exec = {
  sudoPacman(args: string[]): Promise<number>;
  gitClone(url: string, dest: string): Promise<{ stdout: string; stderr: string }>;
  gitPull(cwd: string): Promise<{ stdout: string; stderr: string }>;
  makepkg(cwd: string, args: string[]): Promise<number>;
  findBuiltPackages(cwd: string): Promise<string[]>;
};

export type Ui = {
  confirm(message: string): Promise<boolean>;
  pickNumber(message: string, max: number): Promise<number | null>;
};

export type Services = {
  alpm: Alpm;
  aur: Aur;
  output: Output;
  exec: Exec;
  ui: Ui;
};
