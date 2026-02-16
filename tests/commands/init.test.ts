import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { initProject } from "@/commands/init.js";
import { SCAFFOLD_FILES } from "@/scaffold/templates.js";
import { Logger } from "@/core/logger.js";

/** Creates a fresh temporary directory for each test. */
function makeTmpdir(): string {
  return join(tmpdir(), `praxis-init-test-${randomUUID()}`);
}

describe("initProject", () => {
  const dirs: string[] = [];
  const logger = new Logger();

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("creates target directory if it does not exist", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    expect(existsSync(dir)).toBe(false);
    initProject(dir, logger);
    expect(existsSync(dir)).toBe(true);
  });

  it("writes all scaffold files", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger);

    for (const file of SCAFFOLD_FILES) {
      const fullPath = join(dir, file.path);
      expect(existsSync(fullPath), `expected ${file.path} to exist`).toBe(true);
    }
  });

  it("writes correct content for each scaffold file", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger);

    for (const file of SCAFFOLD_FILES) {
      const fullPath = join(dir, file.path);
      const content = readFileSync(fullPath, "utf-8");
      expect(content, `content mismatch for ${file.path}`).toBe(file.content);
    }
  });

  it("creates the agents output directory", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger);

    const agentsDir = join(dir, "plugins", "praxis", "agents");
    expect(existsSync(agentsDir)).toBe(true);
  });

  it("skips files that already exist", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    // Pre-create the README with custom content
    mkdirSync(dir, { recursive: true });
    const readmePath = join(dir, "README.md");
    writeFileSync(readmePath, "# My Custom README\n");

    initProject(dir, logger);

    // Verify our custom content was preserved, not overwritten
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toBe("# My Custom README\n");
  });

  it("is idempotent — second run skips all files", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger);

    // Modify one file to verify it's not overwritten
    const readmePath = join(dir, "README.md");
    writeFileSync(readmePath, "modified");

    initProject(dir, logger);

    const content = readFileSync(readmePath, "utf-8");
    expect(content).toBe("modified");
  });

  it("works in a non-empty directory with unrelated files", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    // Pre-populate with unrelated files
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "app.ts"), "console.log('hello');\n");
    writeFileSync(join(dir, "package.json"), '{ "name": "my-app" }\n');

    initProject(dir, logger);

    // Scaffold files exist
    expect(existsSync(join(dir, "content", "roles", "README.md"))).toBe(true);

    // Unrelated files preserved
    expect(readFileSync(join(dir, "src", "app.ts"), "utf-8")).toBe("console.log('hello');\n");
    expect(readFileSync(join(dir, "package.json"), "utf-8")).toBe('{ "name": "my-app" }\n');
  });

  it("creates all expected directories", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger);

    const expectedDirs = [
      "content/context/constitution",
      "content/context/conventions",
      "content/context/lenses",
      "content/context/specifications",
      "content/roles",
      "content/responsibilities",
      "content/reference",
      "plugins/praxis/agents",
      "plugins/praxis/.claude-plugin",
      "plugins/praxis/commands",
      ".claude-plugin",
    ];

    for (const expected of expectedDirs) {
      expect(existsSync(join(dir, expected)), `expected directory ${expected} to exist`).toBe(true);
    }
  });
});
