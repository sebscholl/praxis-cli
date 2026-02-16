import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import fg from "fast-glob";

/** Cache format version for backwards-compatibility checks. */
const CACHE_VERSION = "1.0";

/** Severity level for validation issues. */
export type Severity = "warning" | "error";

/** Result of a single document validation, as stored in cache. */
export interface CachedValidationResult {
  compliant: boolean;
  issues: string[];
  reason: string;
  severity?: Severity;
}

/** Full cache file structure written to disk. */
interface CacheFileData {
  version: string;
  cached_at: string;
  content_hash: string;
  document: {
    path: string;
    type: string;
    spec_path: string;
  };
  result: CachedValidationResult;
}

/** Information about an orphaned (stale) cache file. */
export interface OrphanedCacheFile {
  file: string;
  reason: "document_missing" | "stale_hash";
  docName: string;
  type: string;
  expectedHash?: string;
  actualHash?: string;
}

/**
 * Manages a file-based validation result cache.
 *
 * Cache files are stored as JSON under `.praxis/cache/validation/`
 * organized by document type. File names embed a content hash so that
 * cache entries auto-invalidate when either the document or its README
 * specification changes.
 */
export class CacheManager {
  readonly cacheRoot: string;

  constructor(cacheRoot?: string) {
    this.cacheRoot = cacheRoot ?? this.defaultCacheRoot();
  }

  /**
   * Computes the filesystem path for a cache entry.
   *
   * @param documentPath - Path to the validated document
   * @param contentHash - SHA256 hash prefix of document+readme content
   */
  cachePathFor(documentPath: string, contentHash: string): string {
    const relativePath = documentPath.includes("/content/")
      ? documentPath.split("/content/").pop()!
      : documentPath.replace(/^content\//, "");

    const dirPath = dirname(relativePath);
    const base = basename(relativePath, ".md");
    const cacheFilename = `${base}_${contentHash}.json`;

    return join(this.cacheRoot, dirPath, cacheFilename);
  }

  /**
   * Writes a validation result to the cache.
   *
   * Creates parent directories as needed. Silently fails on I/O errors.
   */
  write({
    documentPath,
    contentHash,
    result,
    metadata,
  }: {
    documentPath: string;
    contentHash: string;
    result: CachedValidationResult;
    metadata: { documentType: string; specPath: string };
  }): void {
    const cachePath = this.cachePathFor(documentPath, contentHash);

    const cacheData: CacheFileData = {
      version: CACHE_VERSION,
      cached_at: new Date().toISOString(),
      content_hash: contentHash,
      document: {
        path: documentPath,
        type: metadata.documentType,
        spec_path: metadata.specPath,
      },
      result,
    };

    try {
      mkdirSync(dirname(cachePath), { recursive: true });
      writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    } catch (err) {
      if (process.env["DEBUG"]) {
        console.warn(`Warning: Failed to write cache file (${(err as Error).message})`);
      }
    }
  }

  /**
   * Reads a cached validation result if one exists and is valid.
   *
   * Returns null if the cache file doesn't exist, has a version
   * mismatch, or the content hash doesn't match.
   */
  read({
    documentPath,
    contentHash,
  }: {
    documentPath: string;
    contentHash: string;
  }): CachedValidationResult | null {
    const cachePath = this.cachePathFor(documentPath, contentHash);

    if (!existsSync(cachePath)) {
      return null;
    }

    try {
      const raw = readFileSync(cachePath, "utf-8");
      const cached = JSON.parse(raw) as CacheFileData;

      if (cached.version !== CACHE_VERSION) {
        return null;
      }
      if (cached.content_hash !== contentHash) {
        return null;
      }

      return cached.result;
    } catch (err) {
      if (process.env["DEBUG"]) {
        console.warn(`Warning: Cache read failed for ${cachePath} (${(err as Error).message})`);
      }
      return null;
    }
  }

  /**
   * Returns statistics about the current cache.
   */
  stats(): { totalFiles: number; totalSize: number; byType: Record<string, number> } {
    const cacheFiles = fg.sync("**/*.json", { cwd: this.cacheRoot, absolute: true });

    let totalSize = 0;
    const byType: Record<string, number> = {};

    for (const file of cacheFiles) {
      try {
        const stat = readFileSync(file);
        totalSize += stat.length;
      } catch {
        /* skip unreadable files */
      }

      const relativePath = file.replace(`${this.cacheRoot}/`, "");
      const type = relativePath.split("/")[0] ?? "unknown";
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return { totalFiles: cacheFiles.length, totalSize, byType };
  }

  /**
   * Finds cache files that no longer correspond to valid documents.
   *
   * A cache file is orphaned if the source document was deleted,
   * or if the content hash no longer matches the current document+readme.
   */
  orphanedCacheFiles(contentDir: string): OrphanedCacheFile[] {
    const validDocuments = this.buildDocumentMap(contentDir);
    const orphans: OrphanedCacheFile[] = [];
    const cacheFiles = fg.sync("**/*.json", { cwd: this.cacheRoot, absolute: true });

    for (const cacheFile of cacheFiles) {
      const filename = basename(cacheFile, ".json");
      const parts = filename.split("_");
      const hash = parts.pop();
      const docName = parts.join("_");

      const relativePath = cacheFile.replace(`${this.cacheRoot}/`, "");
      const type = relativePath.split("/")[0] ?? "unknown";
      const docKey = `${type}/${docName}`;

      if (!validDocuments.has(docKey)) {
        orphans.push({ file: cacheFile, reason: "document_missing", docName, type });
      } else if (validDocuments.get(docKey) !== hash) {
        orphans.push({
          file: cacheFile,
          reason: "stale_hash",
          docName,
          type,
          expectedHash: validDocuments.get(docKey),
          actualHash: hash,
        });
      }
    }

    return orphans;
  }

  /** Derives the default cache root from the current working directory. */
  private defaultCacheRoot(): string {
    return join(process.cwd(), ".praxis", "cache", "validation");
  }

  /**
   * Builds a map of document names to their current content hashes.
   *
   * Used by orphan detection to compare against existing cache files.
   */
  private buildDocumentMap(contentDir: string): Map<string, string> {
    const documents = new Map<string, string>();

    const documentTypes: Record<string, string> = {
      roles: "roles/README.md",
      responsibilities: "responsibilities/README.md",
      reference: "reference/README.md",
      "context/conventions": "context/conventions/README.md",
      "context/constitution": "context/constitution/README.md",
    };

    for (const [type, readmeRelativePath] of Object.entries(documentTypes)) {
      const typeDir = join(contentDir, type);
      if (!existsSync(typeDir)) continue;

      const readmePath = join(contentDir, readmeRelativePath);
      const readmeContent = existsSync(readmePath) ? readFileSync(readmePath, "utf-8") : "";

      const docFiles = fg.sync("*.md", { cwd: typeDir, absolute: true });

      for (const docPath of docFiles) {
        const base = basename(docPath, ".md");
        if (base === "README" || base.startsWith("_")) continue;

        const docContent = readFileSync(docPath, "utf-8");
        const hash = contentHash(docContent, readmeContent);

        const normalizedType = type.split("/").pop()!;
        documents.set(`${normalizedType}/${base}`, hash);
      }
    }

    return documents;
  }
}

/**
 * Computes a cache-key hash from document and readme content.
 *
 * Returns the first 8 characters of the SHA256 hex digest, matching
 * the Ruby implementation's behavior for cache compatibility.
 */
export function contentHash(documentContent: string, readmeContent: string): string {
  return createHash("sha256").update(documentContent + readmeContent).digest("hex").slice(0, 8);
}
