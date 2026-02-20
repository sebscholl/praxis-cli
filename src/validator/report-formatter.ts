import { dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import chalk from "chalk";

import type { CacheFileData } from "./cache-manager.js";
import { contentHash } from "./cache-manager.js";

/** All possible report states. */
export type ReportStatus = "not_validated" | "pass" | "warn" | "fail" | "stale";

/** Structured report data for a single document. */
export interface ValidationReport {
  documentPath: string;
  status: ReportStatus;
  cacheData: CacheFileData | null;
  currentHash: string | null;
  isStale: boolean;
}

/**
 * Builds a ValidationReport from cache data and current file state.
 *
 * Staleness takes priority: if the content hash doesn't match,
 * status is "stale" regardless of the underlying cached result.
 */
export function buildReport(
  documentPath: string,
  cacheData: CacheFileData | null,
  currentHash: string | null,
): ValidationReport {
  if (!cacheData) {
    return { documentPath, status: "not_validated", cacheData: null, currentHash, isStale: false };
  }

  const isStale = currentHash !== null && cacheData.content_hash !== currentHash;

  if (isStale) {
    return { documentPath, status: "stale", cacheData, currentHash, isStale };
  }

  if (cacheData.result.compliant) {
    return { documentPath, status: "pass", cacheData, currentHash, isStale: false };
  }

  if (cacheData.result.severity === "warning") {
    return { documentPath, status: "warn", cacheData, currentHash, isStale: false };
  }

  return { documentPath, status: "fail", cacheData, currentHash, isStale: false };
}

/**
 * Computes the current content hash for a document.
 *
 * Returns null if the document or its README spec cannot be read.
 */
export function computeCurrentHash(documentPath: string, readmePath?: string): string | null {
  try {
    const docContent = readFileSync(documentPath, "utf-8");
    const resolvedReadme = readmePath ?? findReadmeForDocument(documentPath);

    if (!resolvedReadme || !existsSync(resolvedReadme)) return null;

    const readmeContent = readFileSync(resolvedReadme, "utf-8");
    return contentHash(docContent, readmeContent);
  } catch {
    return null;
  }
}

/** Finds the README.md in the same directory as the document. */
function findReadmeForDocument(documentPath: string): string | null {
  const dir = dirname(documentPath);
  const readme = dir + "/README.md";
  return existsSync(readme) ? readme : null;
}

/** Divider line width for the report. */
const DIVIDER_WIDTH = 50;

/**
 * Formats and prints a validation report to stdout.
 */
export function displayReport(report: ValidationReport, verbose: boolean): void {
  console.log();
  console.log("=".repeat(DIVIDER_WIDTH));
  console.log("Validation Report");
  console.log("=".repeat(DIVIDER_WIDTH));

  // Document info
  console.log();
  console.log(`  Document:  ${report.documentPath}`);

  if (report.cacheData) {
    console.log(`  Type:      ${report.cacheData.document.type}`);
    console.log(`  Spec:      ${report.cacheData.document.spec_path}`);
    console.log(`  Validated: ${formatDate(report.cacheData.cached_at)}`);
  }

  // Status badge
  console.log();
  console.log(`  Status:    ${formatStatusBadge(report.status)}`);

  // Staleness warning
  if (report.isStale && report.cacheData) {
    console.log();
    console.log(chalk.yellow("  ! Document has changed since last validation"));
    console.log(chalk.yellow("    Run `praxis validate document <path>` to re-validate"));

    // Show the underlying cached result for context
    const cachedStatus = report.cacheData.result.compliant
      ? "PASS"
      : report.cacheData.result.severity === "warning"
        ? "WARN"
        : "FAIL";
    const issueCount = report.cacheData.result.issues.length;
    console.log();
    console.log(
      `  Last result: [${cachedStatus}]${issueCount > 0 ? ` (${issueCount} issue${issueCount === 1 ? "" : "s"})` : ""}`,
    );
  }

  // Issues
  if (report.cacheData && !report.cacheData.result.compliant && report.cacheData.result.issues.length > 0) {
    console.log();
    console.log("  Issues:");
    for (const issue of report.cacheData.result.issues) {
      console.log(`    - ${issue}`);
    }
  }

  // Not validated guidance
  if (report.status === "not_validated") {
    console.log();
    console.log(
      `  Run ${chalk.cyan("`praxis validate document " + report.documentPath + "`")} to validate.`,
    );
  }

  // Verbose: full AI reasoning
  if (verbose && report.cacheData) {
    console.log();
    console.log("-".repeat(DIVIDER_WIDTH));
    console.log("AI Reasoning:");
    console.log("-".repeat(DIVIDER_WIDTH));
    console.log(report.cacheData.result.reason);
  }

  console.log();
  console.log("=".repeat(DIVIDER_WIDTH));
}

/** Formats a status enum into a colored badge string. */
function formatStatusBadge(status: ReportStatus): string {
  switch (status) {
    case "pass":
      return chalk.green("[PASS]") + " Document is compliant";
    case "warn":
      return chalk.yellow("[WARN]") + " Document has warnings";
    case "fail":
      return chalk.red("[FAIL]") + " Document has errors";
    case "stale":
      return chalk.yellow("[STALE]") + " Cached result is outdated";
    case "not_validated":
      return chalk.gray("[NOT VALIDATED]") + " No cached result found";
  }
}

/** Formats an ISO date string into a human-readable local string. */
function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}
