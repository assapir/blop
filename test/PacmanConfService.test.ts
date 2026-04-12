import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PacmanConfService } from "../src/services/PacmanConfService.ts";
import { run } from "../src/core/exec.ts";

describe("PacmanConfService", () => {
  const svc = new PacmanConfService(run);

  it("getRepoList returns repos including core and extra", async () => {
    const repos = await svc.getRepoList();
    assert.ok(repos.length > 0, "should have at least one repo");
    assert.ok(repos.includes("core"), "should include core");
    assert.ok(repos.includes("extra"), "should include extra");
  });

  it("getRepoList returns no empty strings", async () => {
    const repos = await svc.getRepoList();
    for (const repo of repos) {
      assert.ok(repo.length > 0, "repo name should not be empty");
    }
  });

  it("getRepoServers returns URLs for core", async () => {
    const servers = await svc.getRepoServers("core");
    assert.ok(servers.length > 0, "core should have at least one server");
    for (const url of servers) {
      assert.ok(url.startsWith("http"), `server URL should start with http: ${url}`);
    }
  });

  it("getRepoServers rejects for nonexistent repo", async () => {
    await assert.rejects(() => svc.getRepoServers("nonexistent_repo_xyz_12345"));
  });

  it("works with a fake run function", async () => {
    const fakeRun = async () => ({ stdout: "core\nextra\nmultilib\n", stderr: "" });
    const fake = new PacmanConfService(fakeRun);
    const repos = await fake.getRepoList();
    assert.deepStrictEqual(repos, ["core", "extra", "multilib"]);
  });

  it("isColorEnabled returns true when Color is set", async () => {
    const fakeRun = async () => ({ stdout: "Color\n", stderr: "" });
    const fake = new PacmanConfService(fakeRun);
    const enabled = await fake.isColorEnabled();
    assert.strictEqual(enabled, true);
  });

  it("isColorEnabled returns false when Color is not set", async () => {
    const fakeRun = async () => ({ stdout: "", stderr: "" });
    const fake = new PacmanConfService(fakeRun);
    const enabled = await fake.isColorEnabled();
    assert.strictEqual(enabled, false);
  });
});
