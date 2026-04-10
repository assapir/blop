import { run, sudoPacman, gitClone, makepkg, findBuiltPackages } from "../core/exec.ts";
import { confirm, pickNumber } from "../core/format.ts";
import { PacmanConfService } from "./PacmanConfService.ts";
import { AlpmService } from "./AlpmService.ts";
import { AurService } from "./AurService.ts";
import type { Services } from "../contracts/services.ts";

export async function createServices(): Promise<Services> {
  const pacmanConf = new PacmanConfService(run);
  const alpm = await AlpmService.create(pacmanConf);
  const aur = new AurService();
  return {
    alpm,
    aur,
    exec: { sudoPacman, gitClone, makepkg, findBuiltPackages },
    ui: { confirm, pickNumber },
  };
}
