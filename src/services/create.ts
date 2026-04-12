import { run, sudoPacman, gitClone, gitPull, makepkg, findBuiltPackages } from "../core/exec.ts";
import { PacmanConfService } from "./PacmanConfService.ts";
import { AlpmService } from "./AlpmService.ts";
import { AurService } from "./AurService.ts";
import { OutputService } from "./OutputService.ts";
import { createUi } from "./UiService.ts";
import type { Services } from "../contracts/services.ts";

export async function createServices(): Promise<Services> {
  const pacmanConf = new PacmanConfService(run);
  const output = new OutputService(await pacmanConf.isColorEnabled());
  const alpm = await AlpmService.create(pacmanConf);
  const aur = new AurService();
  return {
    alpm,
    aur,
    output,
    exec: { sudoPacman, gitClone, gitPull, makepkg, findBuiltPackages },
    ui: createUi(output),
  };
}
