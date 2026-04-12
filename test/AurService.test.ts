import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AurService } from "../src/services/AurService.ts";
import type { AurResponse, AurSearchResult, AurInfoResult } from "../src/core/types.ts";

function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return async () =>
    ({
      ok,
      status,
      statusText: ok ? "OK" : "Internal Server Error",
      json: async () => body,
    }) as Response;
}

const searchResponse: AurResponse<AurSearchResult> = {
  version: 5,
  type: "search",
  resultcount: 1,
  results: [
    {
      ID: 1,
      Name: "yay",
      PackageBase: "yay",
      Version: "12.5.7-1",
      Description: "Yet another yogurt",
      NumVotes: 2547,
      Popularity: 42.5,
      OutOfDate: null,
      Maintainer: "someone",
    },
  ],
};

const infoResponse: AurResponse<AurInfoResult> = {
  version: 5,
  type: "multiinfo",
  resultcount: 1,
  results: [
    {
      ...searchResponse.results[0],
      Depends: ["pacman>5", "git"],
      MakeDepends: ["go"],
      CheckDepends: [],
      OptDepends: [],
      Conflicts: [],
      Provides: [],
      Replaces: [],
      License: ["GPL-3.0-or-later"],
      URL: "https://github.com/Jguer/yay",
      URLPath: "/cgit/aur.git/snapshot/yay.tar.gz",
      Keywords: [],
      FirstSubmitted: 1500000000,
      LastModified: 1700000000,
    },
  ],
};

describe("AurService", () => {
  it("search returns parsed results", async () => {
    const svc = new AurService(mockFetch(searchResponse));
    const results = await svc.search("yay");
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].Name, "yay");
    assert.strictEqual(results[0].NumVotes, 2547);
  });

  it("search throws on HTTP error", async () => {
    const svc = new AurService(mockFetch({}, false, 500));
    await assert.rejects(() => svc.search("yay"), /AUR RPC: 500/);
  });

  it("search throws on AUR error response", async () => {
    const svc = new AurService(mockFetch({ type: "error", error: "Too many results" }));
    await assert.rejects(() => svc.search("a"), /AUR: Too many results/);
  });

  it("info returns parsed results", async () => {
    const svc = new AurService(mockFetch(infoResponse));
    const results = await svc.info(["yay"]);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].Name, "yay");
    assert.deepStrictEqual(results[0].Depends, ["pacman>5", "git"]);
  });

  it("info returns empty for empty input", async () => {
    let fetchCalled = false;
    const noopFetch = async () => {
      fetchCalled = true;
      return new Response();
    };
    const svc = new AurService(noopFetch as typeof fetch);
    const results = await svc.info([]);
    assert.strictEqual(results.length, 0);
    assert.strictEqual(fetchCalled, false, "fetch should not be called for empty input");
  });

  it("search sends correct URL", async () => {
    let calledUrl = "";
    const captureFetch = async (url: string | URL | Request) => {
      calledUrl = String(url);
      return { ok: true, json: async () => searchResponse } as Response;
    };
    const svc = new AurService(captureFetch as typeof fetch);
    await svc.search("c++");
    assert.ok(calledUrl.includes("type=search"), "should contain type=search");
    assert.ok(calledUrl.includes("arg=c%2B%2B"), "should URL-encode special characters");
  });

  it("info sends arg[] params", async () => {
    let calledUrl = "";
    const captureFetch = async (url: string | URL | Request) => {
      calledUrl = String(url);
      return { ok: true, json: async () => infoResponse } as Response;
    };
    const svc = new AurService(captureFetch as typeof fetch);
    await svc.info(["yay", "paru"]);
    assert.ok(calledUrl.includes("type=info"), "should contain type=info");
    assert.ok(calledUrl.includes("arg%5B%5D=yay"), "should contain arg[]=yay");
    assert.ok(calledUrl.includes("arg%5B%5D=paru"), "should contain arg[]=paru");
  });
});
