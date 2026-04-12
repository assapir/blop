import { createInterface } from "node:readline/promises";
import type { Output, Ui } from "../contracts/services.ts";

type PromptOpts = { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream };

async function prompt(message: string, output: Output, opts?: PromptOpts): Promise<string> {
  const rl = createInterface({
    input: opts?.input ?? process.stdin,
    output: opts?.output ?? process.stdout,
  });
  try {
    return await rl.question(output.formatPrompt(message));
  } finally {
    rl.close();
  }
}

export function createUi(output: Output, opts?: PromptOpts): Ui {
  return {
    async confirm(message: string): Promise<boolean> {
      const input = opts?.input ?? process.stdin;
      const answer = await prompt(`→ ${message} (Y/n) `, output, opts);
      const normalized = answer.trim().toLowerCase();
      if (normalized === "y" || normalized === "yes") return true;
      if (normalized === "") return "isTTY" in input && input.isTTY === true;
      return false;
    },

    async pickNumber(message: string, max: number): Promise<number | null> {
      const answer = await prompt(`${message} `, output, opts);
      const trimmed = answer.trim();
      if (trimmed === "q" || trimmed === "") return null;
      const n = parseInt(trimmed, 10);
      if (isNaN(n) || n < 1 || n > max) return null;
      return n;
    },
  };
}
