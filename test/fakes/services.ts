import { FakeAlpmService } from "./FakeAlpmService.ts";
import { FakeAurService } from "./FakeAurService.ts";
import { FakeExecService } from "./FakeExecService.ts";
import { FakeUiService } from "./FakeUiService.ts";
import type { Services } from "../../src/contracts/services.ts";

export function createFakeServices() {
  const alpm = new FakeAlpmService();
  const aur = new FakeAurService();
  const exec = new FakeExecService();
  const ui = new FakeUiService();
  const services: Services = { alpm, aur, exec, ui };
  return { services, alpm, aur, exec, ui };
}
