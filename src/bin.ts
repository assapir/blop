#!/usr/bin/env node

import { parseCommand, dispatch } from "./cli.ts";
import { error } from "./core/format.ts";
import { createServices } from "./services/create.ts";

try {
  const cmd = parseCommand(process.argv.slice(2));
  const needsServices = cmd.op !== "help" && cmd.op !== "error";
  const services = needsServices ? await createServices() : undefined;
  await dispatch(cmd, services);
} catch (err: unknown) {
  error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
