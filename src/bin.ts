#!/usr/bin/env node

import { main } from "./cli.ts";
import { error } from "./core/format.ts";

try {
  await main();
} catch (err: unknown) {
  error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
