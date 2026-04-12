#!/usr/bin/env node

import { parseCommand, dispatch, USAGE } from "./cli.ts";
import { createServices } from "./services/create.ts";

try {
  const cmd = parseCommand(process.argv.slice(2));
  if (cmd.op === "help") {
    console.log(USAGE);
  } else if (cmd.op === "error") {
    console.error(`error: ${cmd.message}`);
    process.exitCode = 1;
  } else {
    const services = await createServices();
    await dispatch(cmd, services);
  }
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
