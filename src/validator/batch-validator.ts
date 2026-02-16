import { basename, join } from "node:path";

import fg from "fast-glob";

import { CacheManager, type CachedValidationResult } from "./cache-manager.js";
import { DocumentValidator } from "./document-validator.js";

/** Map of document types to their specification and content glob patterns. */
export const DOCUMENT_TYPES: Record<string, { spec: string; glob: string }> = {
  roles: { spec: "content/roles/README.md", glob: "content/roles/*.md" },
  responsibilities: {
    spec: "content/responsibilities/README.md",
    glob: "content/responsibilities/*.md",
  },
  reference: { spec: "content/reference/README.md", glob: "content/reference/*.md" },
  conventions: {
    spec: "content/context/conventions/README.md",
    glob: "content/context/conventions/*.md",
  },
  constitution: {
    spec: "content/context/constitution/README.md",
    glob: "content/context/constitution/*.md",
  },
};

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

/**
 * Validates multiple Praxis documents and aggregates results.
 *
 * Iterates over all document types (or a specific type), validates
 * each document against its directory's README spec, and collects
 * results with optional fail-fast behavior and cache statistics.
 */
export class BatchValidator {
  readonly contentDir: string;
  readonly failFast: boolean;
  readonly cacheStats: { hits: number; misses: number };

  private readonly useCache: boolean;
  private readonly cacheManager: CacheManager | null;
  private results: BatchValidationResult[] = [];
  private stoppedEarly = false;

  constructor({
    contentDir,
    failFast = false,
    useCache = true,
    cacheManager,
  }: {
    contentDir: string;
    failFast?: boolean;
    useCache?: boolean;
    cacheManager?: CacheManager;
  }) {
    this.contentDir = contentDir;
    this.failFast = failFast;
    this.useCache = useCache;
    this.cacheManager = cacheManager ?? (useCache ? new CacheManager() : null);
    this.cacheStats = { hits: 0, misses: 0 };
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
   * Validates all documents across every known document type.
   *
   * Skips READMEs and template files. Respects fail-fast if enabled.
   */
  async validateAll(): Promise<BatchValidationResult[]> {
    this.results = [];
    this.stoppedEarly = false;

    for (const [type, config] of Object.entries(DOCUMENT_TYPES)) {
      if (this.stoppedEarly) break;

      const specPath = join(this.contentDir, "..", config.spec);
      const globPattern = join(this.contentDir, "..", config.glob);
      const docPaths = fg.sync(globPattern, { onlyFiles: true });

      for (const docPath of docPaths) {
        if (this.stoppedEarly) break;

        const name = basename(docPath);
        if (name === "README.md" || name.startsWith("_")) continue;

        await this.validateDocument(docPath, specPath, type);
        this.checkFailFast();
      }
    }

    return this.results;
  }

  /**
   * Validates all documents of a specific type.
   *
   * @param type - Document type key (e.g. "roles", "responsibilities")
   * @throws Error if the type is not recognized
   */
  async validateType(type: string): Promise<BatchValidationResult[]> {
    const config = DOCUMENT_TYPES[type];
    if (!config) {
      throw new Error(`Unknown document type: ${type}`);
    }

    this.results = [];
    this.stoppedEarly = false;

    const specPath = join(this.contentDir, "..", config.spec);
    const globPattern = join(this.contentDir, "..", config.glob);
    const docPaths = fg.sync(globPattern, { onlyFiles: true });

    for (const docPath of docPaths) {
      if (this.stoppedEarly) break;

      const name = basename(docPath);
      if (name === "README.md" || name.startsWith("_")) continue;

      await this.validateDocument(docPath, specPath, type);
      this.checkFailFast();
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
