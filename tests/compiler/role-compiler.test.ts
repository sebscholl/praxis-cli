import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Logger } from "@/core/logger.js";
import { RoleCompiler } from "@/compiler/role-compiler.js";

import { createCompilerTmpdir } from "../helpers/compiler-tmpdir.js";

describe("RoleCompiler", () => {
  let tmpdir: string;
  let rolesDir: string;
  let agentsOutputDir: string;
  let cleanup: () => void;
  let logOutput: string;
  let logger: Logger;
  let compiler: RoleCompiler;

  beforeEach(() => {
    const ctx = createCompilerTmpdir();
    tmpdir = ctx.tmpdir;
    rolesDir = ctx.rolesDir;
    agentsOutputDir = ctx.agentsOutputDir;
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
    it("compiles a single role to an output file", async () => {
      const roleFile = join(rolesDir, "test-role.md");
      const outputFile = join(agentsOutputDir, "tester.md");

      await compiler.compile(roleFile, outputFile);

      expect(existsSync(outputFile)).toBe(true);
    });

    it("includes the role body in output", async () => {
      const roleFile = join(rolesDir, "test-role.md");
      const outputFile = join(agentsOutputDir, "tester.md");

      await compiler.compile(roleFile, outputFile);
      const content = readFileSync(outputFile, "utf-8");

      expect(content).toContain("# Role");
      expect(content).toContain("A test role for unit testing");
    });

    it("expands constitution: true to glob all constitution files", async () => {
      const roleFile = join(rolesDir, "test-role.md");
      const outputFile = join(agentsOutputDir, "tester.md");

      await compiler.compile(roleFile, outputFile);
      const content = readFileSync(outputFile, "utf-8");

      expect(content).toContain("# Constitution");
      expect(content).toContain("Identity");
      expect(content).toContain("Principles");
    });

    it("includes context section from context frontmatter key", async () => {
      const roleFile = join(rolesDir, "test-role.md");
      const outputFile = join(agentsOutputDir, "tester.md");

      await compiler.compile(roleFile, outputFile);
      const content = readFileSync(outputFile, "utf-8");

      expect(content).toContain("# Context");
    });

    it("inlines referenced files (strips their frontmatter)", async () => {
      const roleFile = join(rolesDir, "test-role.md");
      const outputFile = join(agentsOutputDir, "tester.md");

      await compiler.compile(roleFile, outputFile);
      const content = readFileSync(outputFile, "utf-8");

      expect(content).toContain("Test Responsibility");
      expect(content).not.toMatch(/owner: test-role/);
    });

    it("generates output file path from alias when not specified", async () => {
      const roleFile = join(rolesDir, "test-role.md");

      const result = await compiler.compile(roleFile);

      expect(result).toBe(join(agentsOutputDir, "tester.md"));
    });

    it("includes agent_description in compiled output frontmatter", async () => {
      const roleFile = join(rolesDir, "test-role.md");
      const outputFile = join(agentsOutputDir, "tester.md");

      await compiler.compile(roleFile, outputFile);
      const content = readFileSync(outputFile, "utf-8");

      expect(content).toMatch(/^description:/m);
    });

    it("warns when agent_description is missing", async () => {
      const noDesc = join(rolesDir, "no-desc.md");
      writeFileSync(noDesc, "---\nalias: NoDesc\n---\n# Test");
      const outputFile = join(agentsOutputDir, "nodesc.md");

      await compiler.compile(noDesc, outputFile);

      expect(logOutput).toContain("No agent_description found");
    });

    it("does not fallback to blockquote for missing agent_description", async () => {
      const withBlockquote = join(rolesDir, "blockquote.md");
      writeFileSync(withBlockquote, "---\nalias: Block\n---\n> Blockquote text");
      const outputFile = join(agentsOutputDir, "block.md");

      await compiler.compile(withBlockquote, outputFile);
      const content = readFileSync(outputFile, "utf-8");

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
});
