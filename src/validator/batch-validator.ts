import { basename, dirname, join, relative } from "node:path";

import fg from "fast-glob";

import { CacheManager, type CachedValidationResult } from "./cache-manager.js";
import { DocumentValidator } from "./document-validator.js";

/** Extended validation result that includes file path and type information. */
export interface BatchValidationResult extends CachedValidationResult {
  path: string;
  type: string;
  filename: string;
}

/** Aggregated validation summary across all documents. */
export interface ValidationSummary {
  total: number;
  compliant: number;
  warnings: number;
  errors: number;
  byType: Record<
    string,
    {
      total: number;
      compliant: number;
      issues: number;
    }
  >;
}

/** A validation domain: a directory with a README.md spec. */
interface ValidationDomain {
  dir: string;
  readmePath: string;
  type: string;
}

/**
 * Validates multiple Praxis documents and aggregates results.
 *
 * Discovers validation domains by scanning source directories for
 * directories containing README.md files, validates each document
 * against its directory's README spec, and collects results with
 * optional fail-fast behavior and cache statistics.
 */
export class BatchValidator {
  readonly root: string;
  readonly sources: string[];
  readonly failFast: boolean;
  readonly cacheStats: { hits: number; misses: number };

  private readonly useCache: boolean;
  private readonly cacheManager: CacheManager | null;
  private readonly apiKeyEnvVar?: string;
  private readonly model?: string;
  private results: BatchValidationResult[] = [];
  private stoppedEarly = false;

  constructor({
    root,
    sources,
    failFast = false,
    useCache = true,
    cacheManager,
    apiKeyEnvVar,
    model,
  }: {
    root: string;
    sources: string[];
    failFast?: boolean;
    useCache?: boolean;
    cacheManager?: CacheManager;
    apiKeyEnvVar?: string;
    model?: string;
  }) {
    this.root = root;
    this.sources = sources;
    this.failFast = failFast;
    this.useCache = useCache;
    this.cacheManager = cacheManager ?? (useCache ? new CacheManager(undefined, root) : null);
    this.cacheStats = { hits: 0, misses: 0 };
    this.apiKeyEnvVar = apiKeyEnvVar;
    this.model = model;
  }

  /** Whether validation was stopped early due to fail-fast. */
  get stopped(): boolean {
    return this.stoppedEarly;
  }

  /** The accumulated validation results. */
  getResults(): BatchValidationResult[] {
    return this.results;
  }

  /**
   * Validates all documents across all discovered validation domains.
   *
   * Scans source directories for directories containing README.md,
   * then validates all .md files in those directories.
   * Skips READMEs and template files. Respects fail-fast if enabled.
   */
  async validateAll(): Promise<BatchValidationResult[]> {
    this.results = [];
    this.stoppedEarly = false;

    const domains = await this.discoverValidationDomains();

    for (const { dir, readmePath, type } of domains) {
      if (this.stoppedEarly) break;

      const docPaths = fg.sync("*.md", { cwd: dir, onlyFiles: true, absolute: true });

      for (const docPath of docPaths) {
        if (this.stoppedEarly) break;

        const name = basename(docPath);
        if (name === "README.md" || name.startsWith("_")) continue;

        await this.validateDocument(docPath, readmePath, type);
        this.checkFailFast();
      }
    }

    return this.results;
  }

  /**
   * Validates all documents of a specific type.
   *
   * @param type - Type string to filter by (matches directory name or relative path)
   * @throws Error if no matching type is found
   */
  async validateType(type: string): Promise<BatchValidationResult[]> {
    this.results = [];
    this.stoppedEarly = false;

    const domains = await this.discoverValidationDomains();
    const matching = domains.filter(
      (d) => d.type === type || basename(d.dir) === type,
    );

    if (matching.length === 0) {
      throw new Error(`Unknown document type: ${type}`);
    }

    for (const { dir, readmePath, type: domainType } of matching) {
      if (this.stoppedEarly) break;

      const docPaths = fg.sync("*.md", { cwd: dir, onlyFiles: true, absolute: true });

      for (const docPath of docPaths) {
        if (this.stoppedEarly) break;

        const name = basename(docPath);
        if (name === "README.md" || name.startsWith("_")) continue;

        await this.validateDocument(docPath, readmePath, domainType);
        this.checkFailFast();
      }
    }

    return this.results;
  }

  /** Computes an aggregated summary of all validation results. */
  summary(): ValidationSummary {
    const byType: ValidationSummary["byType"] = {};

    for (const result of this.results) {
      if (!byType[result.type]) {
        byType[result.type] = { total: 0, compliant: 0, issues: 0 };
      }
      byType[result.type].total++;
      if (result.compliant) {
        byType[result.type].compliant++;
      } else {
        byType[result.type].issues++;
      }
    }

    return {
      total: this.results.length,
      compliant: this.results.filter((r) => r.compliant).length,
      warnings: this.results.filter((r) => !r.compliant && r.severity === "warning").length,
      errors: this.results.filter((r) => !r.compliant && r.severity === "error").length,
      byType,
    };
  }

  /**
   * Discovers validation domains by scanning source directories.
   *
   * For each source directory, recursively finds all directories
   * containing a README.md file. Each such directory becomes a
   * validation domain.
   */
  private async discoverValidationDomains(): Promise<ValidationDomain[]> {
    const domains: ValidationDomain[] = [];

    for (const source of this.sources) {
      const sourceAbsPath = join(this.root, source);
      const readmePaths = fg.sync("**/README.md", {
        cwd: sourceAbsPath,
        onlyFiles: true,
        absolute: true,
      });

      // Also check if the source dir itself has a README
      const sourceReadme = join(sourceAbsPath, "README.md");
      const allReadmes = readmePaths.includes(sourceReadme)
        ? readmePaths
        : [...readmePaths];

      for (const readmePath of allReadmes) {
        const dir = dirname(readmePath);
        const type = relative(this.root, dir) || basename(dir);
        domains.push({ dir, readmePath, type });
      }
    }

    return domains;
  }

  /** Checks if the last result triggers fail-fast (stops on errors, not warnings). */
  private checkFailFast(): void {
    if (!this.failFast) return;

    const lastResult = this.results[this.results.length - 1];
    if (lastResult && !lastResult.compliant && lastResult.severity === "error") {
      this.stoppedEarly = true;
    }
  }

  /**
   * Validates a single document and appends the result.
   *
   * Tracks cache hit/miss statistics for reporting.
   */
  private async validateDocument(
    docPath: string,
    specPath: string,
    type: string,
  ): Promise<void> {
    console.log(`Validating ${docPath}`);

    try {
      const validator = new DocumentValidator({
        documentPath: docPath,
        specPath,
        useCache: this.useCache,
        cacheManager: this.cacheManager ?? undefined,
        apiKeyEnvVar: this.apiKeyEnvVar,
        model: this.model,
      });

      const result = await validator.validate();

      if (validator.cacheHit) {
        this.cacheStats.hits++;
      } else {
        this.cacheStats.misses++;
      }

      this.results.push({
        ...result,
        path: docPath,
        type,
        filename: basename(docPath),
      });
    } catch (err) {
      this.results.push({
        path: docPath,
        type,
        filename: basename(docPath),
        compliant: false,
        severity: "error",
        issues: [`Validation failed: ${(err as Error).message}`],
        reason: (err as Error).message,
      });
    }
  }
}
