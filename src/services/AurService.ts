import type { AurSearchResult, AurInfoResult, AurResponse } from "../core/types.ts";
import type { Aur } from "../contracts/services.ts";

const AUR_BASE = "https://aur.archlinux.org/rpc";
const BATCH_SIZE = 200;

export class AurService implements Aur {
  #fetch: typeof fetch;

  constructor(fetchFn: typeof fetch = fetch) {
    this.#fetch = fetchFn;
  }

  async search(query: string): Promise<AurSearchResult[]> {
    return this.#rpcFetch<AurSearchResult>(
      new URLSearchParams({ v: "5", type: "search", arg: query }),
    );
  }

  async info(names: string[]): Promise<AurInfoResult[]> {
    if (names.length === 0) return [];

    const results: AurInfoResult[] = [];
    for (let i = 0; i < names.length; i += BATCH_SIZE) {
      const batch = names.slice(i, i + BATCH_SIZE);
      const params = new URLSearchParams({ v: "5", type: "info" });
      for (const name of batch) params.append("arg[]", name);
      const batchResults = await this.#rpcFetch<AurInfoResult>(params);
      results.push(...batchResults);
    }
    return results;
  }

  async #rpcFetch<T>(params: URLSearchParams): Promise<T[]> {
    const res = await this.#fetch(`${AUR_BASE}?${params}`);
    if (!res.ok) throw new Error(`AUR RPC: ${res.status} ${res.statusText}`);
    const body = (await res.json()) as AurResponse<T>;
    if (body.type === "error") throw new Error(`AUR: ${(body as Record<string, unknown>).error}`);
    return body.results;
  }
}
