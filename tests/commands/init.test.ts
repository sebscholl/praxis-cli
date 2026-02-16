import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { initProject } from "@/commands/init.js";
import { Logger } from "@/core/logger.js";

/** Resolved path to the scaffold directory at the project root. */
const SCAFFOLD_DIR = join(import.meta.dirname, "..", "..", "scaffold");

/** Creates a fresh temporary directory for each test. */
function makeTmpdir(): string {
  return join(tmpdir(), `praxis-init-test-${randomUUID()}`);
}

/**
 * Recursively walks a directory and returns sorted relative file paths.
 */
function walkDir(dir: string, base = dir): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...walkDir(fullPath, base));
    } else {
      results.push(relative(base, fullPath));
    }
  }
  return results.sort();
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
    initProject(dir, logger, SCAFFOLD_DIR);
    expect(existsSync(dir)).toBe(true);
  });

  it("writes all core scaffold files", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger, SCAFFOLD_DIR);

    const coreDir = join(SCAFFOLD_DIR, "core");
    for (const relPath of walkDir(coreDir)) {
      const fullPath = join(dir, relPath);
      expect(existsSync(fullPath), `expected ${relPath} to exist`).toBe(true);
    }
  });

  it("writes correct content for each core scaffold file", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger, SCAFFOLD_DIR);

    const coreDir = join(SCAFFOLD_DIR, "core");
    for (const relPath of walkDir(coreDir)) {
      const expected = readFileSync(join(coreDir, relPath), "utf-8");
      const actual = readFileSync(join(dir, relPath), "utf-8");
      expect(actual, `content mismatch for ${relPath}`).toBe(expected);
    }
  });

  it("scaffolds praxis.config.json", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger, SCAFFOLD_DIR);

    const configPath = join(dir, "praxis.config.json");
    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.agentProfilesDir).toBe("./agent-profiles");
    expect(config.plugins).toEqual([]);
  });

  it("does not scaffold Claude Code files by default", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger, SCAFFOLD_DIR);

    // Default config has plugins: [], so no Claude Code files
    expect(existsSync(join(dir, ".claude-plugin"))).toBe(false);
    expect(existsSync(join(dir, "plugins", "praxis"))).toBe(false);
  });

  it("scaffolds Claude Code files when plugin is in config", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    // Pre-create config with claude-code plugin enabled
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ agentProfilesDir: "./agent-profiles", plugins: ["claude-code"] }),
    );

    initProject(dir, logger, SCAFFOLD_DIR);

    expect(existsSync(join(dir, ".claude-plugin", "marketplace.json"))).toBe(true);
    expect(existsSync(join(dir, "plugins", "praxis", ".claude-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(dir, "plugins", "praxis", "commands", "huddle.md"))).toBe(true);
  });

  it("skips files that already exist", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    // Pre-create the README with custom content
    mkdirSync(dir, { recursive: true });
    const readmePath = join(dir, "README.md");
    writeFileSync(readmePath, "# My Custom README\n");

    initProject(dir, logger, SCAFFOLD_DIR);

    // Verify our custom content was preserved, not overwritten
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toBe("# My Custom README\n");
  });

  it("is idempotent — second run skips all files", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger, SCAFFOLD_DIR);

    // Modify one file to verify it's not overwritten
    const readmePath = join(dir, "README.md");
    writeFileSync(readmePath, "modified");

    initProject(dir, logger, SCAFFOLD_DIR);

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

    initProject(dir, logger, SCAFFOLD_DIR);

    // Scaffold files exist
    expect(existsSync(join(dir, "content", "roles", "README.md"))).toBe(true);

    // Unrelated files preserved
    expect(readFileSync(join(dir, "src", "app.ts"), "utf-8")).toBe("console.log('hello');\n");
    expect(readFileSync(join(dir, "package.json"), "utf-8")).toBe('{ "name": "my-app" }\n');
  });

  it("creates all expected core directories", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    initProject(dir, logger, SCAFFOLD_DIR);

    const expectedDirs = [
      "content/context/constitution",
      "content/context/conventions",
      "content/context/lenses",
      "content/roles",
      "content/responsibilities",
      "content/reference",
    ];

    for (const expected of expectedDirs) {
      expect(existsSync(join(dir, expected)), `expected directory ${expected} to exist`).toBe(true);
    }
  });

  it("creates Claude Code directories when plugin is enabled", () => {
    const dir = makeTmpdir();
    dirs.push(dir);

    // Pre-create config with claude-code enabled
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "praxis.config.json"),
      JSON.stringify({ plugins: ["claude-code"] }),
    );

    initProject(dir, logger, SCAFFOLD_DIR);

    const expectedDirs = [
      "plugins/praxis/.claude-plugin",
      "plugins/praxis/commands",
      ".claude-plugin",
    ];

    for (const expected of expectedDirs) {
      expect(existsSync(join(dir, expected)), `expected directory ${expected} to exist`).toBe(true);
    }
  });
});
