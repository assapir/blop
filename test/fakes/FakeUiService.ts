import type { Ui } from "../../src/contracts/services.ts";

export class FakeUiService implements Ui {
  #confirmAnswer = false;
  #pickAnswer: number | null = null;
  calls: { fn: string; args: unknown[] }[] = [];

  setConfirmAnswer(answer: boolean): void {
    this.#confirmAnswer = answer;
  }

  setPickAnswer(answer: number | null): void {
    this.#pickAnswer = answer;
  }

  async confirm(message: string): Promise<boolean> {
    this.calls.push({ fn: "confirm", args: [message] });
    return this.#confirmAnswer;
  }

  async pickNumber(message: string, max: number): Promise<number | null> {
    this.calls.push({ fn: "pickNumber", args: [message, max] });
    return this.#pickAnswer;
  }
}
