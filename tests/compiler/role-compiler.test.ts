import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Logger } from "@/core/logger.js";
import { PraxisConfig } from "@/core/config.js";
import { RoleCompiler } from "@/compiler/role-compiler.js";

import { createCompilerTmpdir } from "../helpers/compiler-tmpdir.js";

describe("RoleCompiler", () => {
  let tmpdir: string;
  let rolesDir: string;
  let agentsOutputDir: string;
  let agentProfilesDir: string;
  let cleanup: () => void;
  let logOutput: string;
  let logger: Logger;
  let compiler: RoleCompiler;

  beforeEach(() => {
    const ctx = createCompilerTmpdir();
    tmpdir = ctx.tmpdir;
    rolesDir = ctx.rolesDir;
    agentsOutputDir = ctx.agentsOutputDir;
    agentProfilesDir = ctx.agentProfilesDir;
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
  });

  afterEach(() => {
    cleanup();
  });

  describe("compile()", () => {
    it("compiles a single role to agent output and profile", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);

      expect(existsSync(join(agentsOutputDir, "tester.md"))).toBe(true);
      expect(existsSync(join(agentProfilesDir, "tester.md"))).toBe(true);
    });

    it("includes the role body in plugin output", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);
      const content = readFileSync(join(agentsOutputDir, "tester.md"), "utf-8");

      expect(content).toContain("# Role");
      expect(content).toContain("A test role for unit testing");
    });

    it("expands constitution: true to glob all constitution files", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);
      const content = readFileSync(join(agentsOutputDir, "tester.md"), "utf-8");

      expect(content).toContain("# Constitution");
      expect(content).toContain("Identity");
      expect(content).toContain("Principles");
    });

    it("includes context section from context frontmatter key", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);
      const content = readFileSync(join(agentsOutputDir, "tester.md"), "utf-8");

      expect(content).toContain("# Context");
    });

    it("inlines referenced files (strips their frontmatter)", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);
      const content = readFileSync(join(agentsOutputDir, "tester.md"), "utf-8");

      expect(content).toContain("Test Responsibility");
      expect(content).not.toMatch(/owner: test-role/);
    });

    it("includes agent_description in Claude Code plugin frontmatter", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);
      const content = readFileSync(join(agentsOutputDir, "tester.md"), "utf-8");

      expect(content).toMatch(/^description:/m);
    });

    it("warns when agent_description is missing", async () => {
      const noDesc = join(rolesDir, "no-desc.md");
      writeFileSync(noDesc, "---\nalias: NoDesc\n---\n# Test");

      await compiler.compile(noDesc);

      expect(logOutput).toContain("No agent_description found");
    });

    it("does not fallback to blockquote for missing agent_description", async () => {
      const withBlockquote = join(rolesDir, "blockquote.md");
      writeFileSync(withBlockquote, "---\nalias: Block\n---\n> Blockquote text");

      await compiler.compile(withBlockquote);
      const content = readFileSync(join(agentsOutputDir, "block.md"), "utf-8");

      expect(content).not.toMatch(/^description: Blockquote text/m);
    });
  });

  describe("compileAll()", () => {
    it("compiles all roles in the roles directory", async () => {
      const result = await compiler.compileAll();

      expect(result.compiled).toBeGreaterThanOrEqual(1);
    });

    it("skips _template.md files", async () => {
      const template = join(rolesDir, "_template.md");
      writeFileSync(template, "---\nalias: Template\n---\n# Template");

      await compiler.compileAll();

      expect(existsSync(join(agentsOutputDir, "template.md"))).toBe(false);
    });

    it("skips README.md files", async () => {
      await compiler.compileAll();

      expect(existsSync(join(agentsOutputDir, "readme.md"))).toBe(false);
    });

    it("skips roles without alias", async () => {
      const noAlias = join(rolesDir, "no-alias.md");
      writeFileSync(noAlias, "---\ntitle: No Alias\n---\n# No Alias Role");

      const result = await compiler.compileAll();

      expect(result).toBeTypeOf("object");
    });
  });

  describe("config-driven output", () => {
    it("writes pure profiles without frontmatter to agentProfilesDir", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);
      const profile = readFileSync(join(agentProfilesDir, "tester.md"), "utf-8");

      // Pure profile has no frontmatter
      expect(profile).not.toMatch(/^---\n/);
      expect(profile).toContain("# Role");
    });

    it("writes Claude Code frontmatter only in plugin output", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      await compiler.compile(roleFile);

      const pluginOutput = readFileSync(join(agentsOutputDir, "tester.md"), "utf-8");
      const profileOutput = readFileSync(join(agentProfilesDir, "tester.md"), "utf-8");

      expect(pluginOutput).toMatch(/^---\n/);
      expect(pluginOutput).toContain("name: tester");
      expect(profileOutput).not.toContain("name: tester");
    });

    it("skips profile output when agentProfilesDir is false", async () => {
      // Create compiler with profiles disabled
      writeFileSync(
        join(tmpdir, "praxis.config.json"),
        JSON.stringify({ agentProfilesDir: false, plugins: ["claude-code"] }),
      );
      const noProfileCompiler = new RoleCompiler({ root: tmpdir, logger });
      const roleFile = join(rolesDir, "test-role.md");

      await noProfileCompiler.compile(roleFile);

      // Plugin output exists, profile dir does not
      expect(existsSync(join(agentsOutputDir, "tester.md"))).toBe(true);
      expect(existsSync(join(agentProfilesDir, "tester.md"))).toBe(false);
    });

    it("skips plugin output when plugins array is empty", async () => {
      // Create compiler with no plugins
      writeFileSync(
        join(tmpdir, "praxis.config.json"),
        JSON.stringify({ agentProfilesDir: "./agent-profiles", plugins: [] }),
      );
      const noPluginCompiler = new RoleCompiler({ root: tmpdir, logger });
      const roleFile = join(rolesDir, "test-role.md");

      await noPluginCompiler.compile(roleFile);

      // Profile exists, plugin output does not
      expect(existsSync(join(agentProfilesDir, "tester.md"))).toBe(true);
      expect(existsSync(join(agentsOutputDir, "tester.md"))).toBe(false);
    });
  });
});
