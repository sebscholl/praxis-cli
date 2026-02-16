import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { ClaudeCodePlugin } from "@/compiler/plugins/claude-code.js";
import { Logger } from "@/core/logger.js";

describe("ClaudeCodePlugin", () => {
  const dirs: string[] = [];

  function makeTmpdir(): string {
    const dir = join(tmpdir(), `praxis-plugin-test-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    dirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("writes agent file to plugins/praxis/agents/", () => {
    const root = makeTmpdir();
    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });

    plugin.compile("# Role\n\nTest content\n", { name: "tester", description: "A test agent" }, "Tester");

    const outputFile = join(root, "plugins", "praxis", "agents", "tester.md");
    expect(existsSync(outputFile)).toBe(true);
  });

  it("prepends Claude Code frontmatter", () => {
    const root = makeTmpdir();
    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });

    plugin.compile("# Role\n\nTest content\n", { name: "tester", description: "A test agent" }, "Tester");

    const content = readFileSync(join(root, "plugins", "praxis", "agents", "tester.md"), "utf-8");
    expect(content).toMatch(/^---\n/);
    expect(content).toContain("name: tester");
    expect(content).toContain("description: A test agent");
    expect(content).toContain("# Role");
  });

  it("includes optional metadata fields", () => {
    const root = makeTmpdir();
    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });

    plugin.compile("# Role\n\nContent\n", {
      name: "tester",
      description: "A test agent",
      tools: "Read, Glob, Grep",
      model: "opus",
      permissionMode: "plan",
    }, "Tester");

    const content = readFileSync(join(root, "plugins", "praxis", "agents", "tester.md"), "utf-8");
    expect(content).toContain("tools: Read, Glob, Grep");
    expect(content).toContain("model: opus");
    expect(content).toContain("permissionMode: plan");
  });

  it("writes profile without frontmatter when metadata is null", () => {
    const root = makeTmpdir();
    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });

    plugin.compile("# Role\n\nContent\n", null, "Tester");

    const content = readFileSync(join(root, "plugins", "praxis", "agents", "tester.md"), "utf-8");
    expect(content).not.toMatch(/^---\n/);
    expect(content).toContain("# Role");
  });

  it("quotes description with special YAML characters", () => {
    const root = makeTmpdir();
    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });

    plugin.compile("# Role\n\nContent\n", {
      name: "tester",
      description: "Use this agent to do: things & stuff [here]",
    }, "Tester");

    const content = readFileSync(join(root, "plugins", "praxis", "agents", "tester.md"), "utf-8");
    expect(content).toContain('description: "Use this agent to do: things & stuff [here]"');
  });

  it("lowercases the alias for the filename", () => {
    const root = makeTmpdir();
    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });

    plugin.compile("Content", { name: "stewart", description: "Test" }, "Stewart");

    expect(existsSync(join(root, "plugins", "praxis", "agents", "stewart.md"))).toBe(true);
  });

  it("creates the agents directory if it does not exist", () => {
    const root = makeTmpdir();
    const agentsDir = join(root, "plugins", "praxis", "agents");

    expect(existsSync(agentsDir)).toBe(false);

    const plugin = new ClaudeCodePlugin({ root, logger: new Logger() });
    plugin.compile("Content", null, "test");

    expect(existsSync(agentsDir)).toBe(true);
  });
});
