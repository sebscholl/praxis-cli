import { basename, join, relative } from "node:path";
import { existsSync } from "node:fs";

import type { Command } from "commander";
import fg from "fast-glob";

import { Frontmatter } from "@/compiler/frontmatter.js";
import { GlobExpander } from "@/compiler/glob-expander.js";
import { Logger } from "@/core/logger.js";
import { Paths } from "@/core/paths.js";

/** Files excluded from content counts. */
const EXCLUDED_FILES = ["_template.md", "README.md"];

/** Structured report of project health. */
export interface StatusReport {
  counts: {
    roles: number;
    responsibilities: number;
    references: number;
    context: number;
  };
  orphanedResponsibilities: string[];
  danglingRefs: { role: string; ref: string }[];
  rolesMissingDescription: string[];
  zeroMatchGlobs: { role: string; pattern: string }[];
  unmatchedOwners: { responsibility: string; owner: string }[];
}

/**
 * Registers the `praxis status` command.
 *
 * Performs static analysis of the project structure and reports
 * counts, orphaned files, dangling references, and other health issues.
 */
export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show project health dashboard")
    .action(async () => {
      const logger = new Logger();
      try {
        const paths = new Paths();
        const report = await analyzeProject(paths);
        displayReport(report, logger);

        const hasIssues =
          report.danglingRefs.length > 0 ||
          report.orphanedResponsibilities.length > 0 ||
          report.rolesMissingDescription.length > 0 ||
          report.zeroMatchGlobs.length > 0 ||
          report.unmatchedOwners.length > 0;

        if (hasIssues) {
          process.exitCode = 1;
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Analyzes a Praxis project and returns a structured health report.
 *
 * Scans all content directories, checks cross-references between
 * roles and responsibilities, and identifies common issues.
 *
 * @param paths - Paths instance pointed at the project root
 */
export async function analyzeProject(paths: Paths): Promise<StatusReport> {
  const root = paths.root;
  const globExpander = new GlobExpander(root);

  // Count content files by type
  const roleFiles = await listContentFiles(paths.rolesDir);
  const respFiles = await listContentFiles(join(root, "content", "responsibilities"));
  const refFiles = await listContentFiles(join(root, "content", "reference"));
  const ctxFiles = await listContentFiles(join(root, "content", "context"), true);

  // Build role alias map and check roles
  const roleAliases = new Map<string, string>();
  const allReferencedResps = new Set<string>();
  const danglingRefs: StatusReport["danglingRefs"] = [];
  const zeroMatchGlobs: StatusReport["zeroMatchGlobs"] = [];
  const rolesMissingDescription: string[] = [];

  for (const roleFile of roleFiles) {
    const fm = new Frontmatter(roleFile);
    const alias = fm.value("alias") as string | undefined;
    const roleName = basename(roleFile);

    if (alias) {
      roleAliases.set(alias.toLowerCase(), roleName);
    }

    if (!fm.value("description")) {
      rolesMissingDescription.push(roleName);
    }

    // Check all ref-type keys
    for (const key of ["responsibilities", "context", "refs"]) {
      const patterns = fm.array(key) as string[];

      for (const pattern of patterns) {
        if (globExpander.isGlob(pattern)) {
          const matches = await globExpander.expand(pattern);
          if (matches.length === 0) {
            zeroMatchGlobs.push({ role: roleName, pattern });
          }
          if (key === "responsibilities") {
            for (const m of matches) allReferencedResps.add(m);
          }
        } else {
          const fullPath = join(root, pattern);
          if (!existsSync(fullPath)) {
            danglingRefs.push({ role: roleName, ref: pattern });
          }
          if (key === "responsibilities") {
            allReferencedResps.add(pattern);
          }
        }
      }
    }
  }

  // Find orphaned responsibilities
  const orphanedResponsibilities: string[] = [];
  for (const respFile of respFiles) {
    const relPath = relative(root, respFile);
    if (!allReferencedResps.has(relPath)) {
      orphanedResponsibilities.push(basename(respFile));
    }
  }

  // Find unmatched owners
  const unmatchedOwners: StatusReport["unmatchedOwners"] = [];
  for (const respFile of respFiles) {
    const fm = new Frontmatter(respFile);
    const owner = fm.value("owner") as string | undefined;
    if (owner && !roleAliases.has(owner.toLowerCase())) {
      unmatchedOwners.push({ responsibility: basename(respFile), owner });
    }
  }

  return {
    counts: {
      roles: roleFiles.length,
      responsibilities: respFiles.length,
      references: refFiles.length,
      context: ctxFiles.length,
    },
    orphanedResponsibilities,
    danglingRefs,
    rolesMissingDescription,
    zeroMatchGlobs,
    unmatchedOwners,
  };
}

/**
 * Lists content files in a directory, excluding templates and READMEs.
 *
 * @param dir - Absolute path to the content directory
 * @param recursive - Whether to search subdirectories
 */
async function listContentFiles(dir: string, recursive = false): Promise<string[]> {
  if (!existsSync(dir)) return [];

  const pattern = recursive ? "**/*.md" : "*.md";
  const files = await fg(pattern, { cwd: dir, onlyFiles: true, absolute: true });

  return files.filter((f) => !EXCLUDED_FILES.includes(basename(f)) && !basename(f).startsWith("_"));
}

/**
 * Displays the status report to the console.
 */
function displayReport(report: StatusReport, logger: Logger): void {
  logger.info("Praxis Project Status");
  console.log();
  console.log(`  Roles:              ${report.counts.roles}`);
  console.log(`  Responsibilities:   ${report.counts.responsibilities}`);
  console.log(`  References:         ${report.counts.references}`);
  console.log(`  Context files:      ${report.counts.context}`);

  let issueCount = 0;

  if (report.danglingRefs.length > 0) {
    console.log();
    logger.warn("Dangling references (file not found):");
    for (const { role, ref } of report.danglingRefs) {
      console.log(`  ${role} → ${ref}`);
      issueCount++;
    }
  }

  if (report.orphanedResponsibilities.length > 0) {
    console.log();
    logger.warn("Orphaned responsibilities (not referenced by any role):");
    for (const resp of report.orphanedResponsibilities) {
      console.log(`  ${resp}`);
      issueCount++;
    }
  }

  if (report.rolesMissingDescription.length > 0) {
    console.log();
    logger.warn("Roles missing description:");
    for (const role of report.rolesMissingDescription) {
      console.log(`  ${role}`);
      issueCount++;
    }
  }

  if (report.zeroMatchGlobs.length > 0) {
    console.log();
    logger.warn("Glob patterns matching zero files:");
    for (const { role, pattern } of report.zeroMatchGlobs) {
      console.log(`  ${role}: ${pattern}`);
      issueCount++;
    }
  }

  if (report.unmatchedOwners.length > 0) {
    console.log();
    logger.warn("Responsibilities with unknown owners:");
    for (const { responsibility, owner } of report.unmatchedOwners) {
      console.log(`  ${responsibility} (owner: ${owner})`);
      issueCount++;
    }
  }

  console.log();
  if (issueCount === 0) {
    logger.success("No issues found");
  } else {
    logger.info(`${issueCount} issue(s) found`);
  }
}
