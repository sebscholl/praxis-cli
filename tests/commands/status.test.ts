import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { analyzeProject } from "@/commands/status.js";
import { Paths } from "@/core/paths.js";

import { createCompilerTmpdir } from "../helpers/compiler-tmpdir.js";

describe("analyzeProject", () => {
  let tmpdir: string;
  let cleanup: () => void;
  let paths: Paths;

  beforeEach(() => {
    const ctx = createCompilerTmpdir();
    tmpdir = ctx.tmpdir;
    cleanup = ctx.cleanup;
    paths = new Paths(tmpdir);
  });

  afterEach(() => {
    cleanup();
  });

  it("counts roles, responsibilities, references, and context", async () => {
    const report = await analyzeProject(paths);

    expect(report.counts.roles).toBe(1);
    expect(report.counts.responsibilities).toBe(1);
    expect(report.counts.references).toBe(1);
    expect(report.counts.context).toBeGreaterThanOrEqual(2); // identity.md, principles.md, documentation.md
  });

  it("excludes _template.md and README.md from counts", async () => {
    // The fixtures include README.md files — verify they're excluded
    const report = await analyzeProject(paths);

    // If READMEs were counted, we'd have more than 1 role
    expect(report.counts.roles).toBe(1);
    expect(report.counts.responsibilities).toBe(1);
  });

  it("detects dangling refs", async () => {
    writeFileSync(
      join(tmpdir, "content", "roles", "bad-refs.md"),
      "---\nalias: BadRefs\ndescription: test\nrefs:\n  - content/reference/nonexistent.md\n---\n# Bad",
    );

    const report = await analyzeProject(paths);

    expect(report.danglingRefs).toContainEqual({
      role: "bad-refs.md",
      ref: "content/reference/nonexistent.md",
    });
  });

  it("detects orphaned responsibilities", async () => {
    writeFileSync(
      join(tmpdir, "content", "responsibilities", "orphan.md"),
      "---\ntitle: Orphan\ntype: responsibility\nowner: nobody\n---\n# Orphan",
    );

    const report = await analyzeProject(paths);

    expect(report.orphanedResponsibilities).toContain("orphan.md");
  });

  it("detects roles missing description", async () => {
    writeFileSync(
      join(tmpdir, "content", "roles", "no-desc.md"),
      "---\nalias: NoDesc\n---\n# No Description",
    );

    const report = await analyzeProject(paths);

    expect(report.rolesMissingDescription).toContain("no-desc.md");
  });

  it("detects zero-match glob patterns", async () => {
    writeFileSync(
      join(tmpdir, "content", "roles", "bad-glob.md"),
      "---\nalias: BadGlob\ndescription: test\nrefs:\n  - content/reference/nope-*.md\n---\n# Bad",
    );

    const report = await analyzeProject(paths);

    expect(report.zeroMatchGlobs).toContainEqual({
      role: "bad-glob.md",
      pattern: "content/reference/nope-*.md",
    });
  });

  it("detects unmatched owners", async () => {
    writeFileSync(
      join(tmpdir, "content", "responsibilities", "unmatched.md"),
      "---\ntitle: Unmatched\ntype: responsibility\nowner: phantom-role\n---\n# Unmatched",
    );

    const report = await analyzeProject(paths);

    expect(report.unmatchedOwners).toContainEqual({
      responsibility: "unmatched.md",
      owner: "phantom-role",
    });
  });

  it("reports clean for a healthy project", async () => {
    const report = await analyzeProject(paths);

    // The default fixtures form a healthy project
    expect(report.danglingRefs).toEqual([]);
    expect(report.rolesMissingDescription).toEqual([]);
    expect(report.zeroMatchGlobs).toEqual([]);
  });
});
