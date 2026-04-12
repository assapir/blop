import { FakeAlpmService } from "./FakeAlpmService.ts";
import { FakeAurService } from "./FakeAurService.ts";
import { FakeExecService } from "./FakeExecService.ts";
import { FakeOutputService } from "./FakeOutputService.ts";
import { FakeUiService } from "./FakeUiService.ts";
import type { Services } from "../../src/contracts/services.ts";

export function createFakeServices() {
  const alpm = new FakeAlpmService();
  const aur = new FakeAurService();
  const output = new FakeOutputService();
  const exec = new FakeExecService();
  const ui = new FakeUiService();
  const services: Services = { alpm, aur, output, exec, ui };
  return { services, alpm, aur, output, exec, ui };
}
