import { type FSWatcher, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { watchAndRecompile } from "@/commands/compile.js";
import { RoleCompiler } from "@/compiler/role-compiler.js";
import { Logger } from "@/core/logger.js";
import { Paths } from "@/core/paths.js";

import { createCompilerTmpdir } from "../helpers/compiler-tmpdir.js";

/** Helper to wait for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("watchAndRecompile", () => {
  let tmpdir: string;
  let cleanup: () => void;
  let logOutput: string;
  let logger: Logger;
  let compiler: RoleCompiler;
  let paths: Paths;
  let watcher: FSWatcher | null = null;

  beforeEach(() => {
    const ctx = createCompilerTmpdir();
    tmpdir = ctx.tmpdir;
    cleanup = ctx.cleanup;

    logOutput = "";
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logOutput += chunk.toString();
        callback();
      },
    });
    logger = new Logger({ output: stream, color: false });
    compiler = new RoleCompiler({ root: tmpdir, logger });
    paths = new Paths(tmpdir);
  });

  afterEach(() => {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    cleanup();
  });

  it("returns an FSWatcher that can be closed", () => {
    watcher = watchAndRecompile(paths, compiler, logger, { debounceMs: 50 });

    expect(watcher).toBeDefined();
    expect(typeof watcher.close).toBe("function");
  });

  it("logs watching message on start", () => {
    watcher = watchAndRecompile(paths, compiler, logger, { debounceMs: 50 });

    expect(logOutput).toContain("Watching");
    expect(logOutput).toContain("for changes");
  });

  it("triggers recompile on file change", async () => {
    watcher = watchAndRecompile(paths, compiler, logger, { debounceMs: 50 });

    // Modify a file in content/
    writeFileSync(
      join(tmpdir, "content", "roles", "test-role.md"),
      "---\nalias: Tester\ndescription: updated\n---\n# Updated",
    );

    // Wait for debounce + processing
    await sleep(300);

    expect(logOutput).toContain("Change detected");
    expect(logOutput).toContain("recompiling");
  });

  it("debounces rapid changes", async () => {
    watcher = watchAndRecompile(paths, compiler, logger, { debounceMs: 100 });

    // Trigger 5 rapid writes
    for (let i = 0; i < 5; i++) {
      writeFileSync(
        join(tmpdir, "content", "roles", "test-role.md"),
        `---\nalias: Tester\ndescription: change ${i}\n---\n# Change ${i}`,
      );
    }

    // Wait for debounce + processing
    await sleep(400);

    // Should see "Change detected" only once (debounced)
    const changeCount = (logOutput.match(/Change detected/g) || []).length;
    expect(changeCount).toBe(1);
  });
});
