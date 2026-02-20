import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CacheManager, contentHash } from "@/validator/cache-manager.js";

describe("CacheManager", () => {
  let projectRoot: string;
  let cacheRoot: string;
  let manager: CacheManager;
  let cleanup: () => void;

  beforeEach(() => {
    projectRoot = join(tmpdir(), `praxis-cache-test-${randomUUID()}`);
    mkdirSync(projectRoot, { recursive: true });
    cacheRoot = join(projectRoot, ".praxis", "cache", "validation");
    manager = new CacheManager(cacheRoot, projectRoot);

    cleanup = () => {
      rmSync(projectRoot, { recursive: true, force: true });
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe("contentHash()", () => {
    it("returns first 8 characters of SHA256 hex digest", () => {
      const hash = contentHash("doc content", "readme content");

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it("produces different hashes for different content", () => {
      const hash1 = contentHash("doc A", "readme");
      const hash2 = contentHash("doc B", "readme");

      expect(hash1).not.toBe(hash2);
    });

    it("changes when readme content changes", () => {
      const hash1 = contentHash("doc", "readme v1");
      const hash2 = contentHash("doc", "readme v2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("cachePathFor()", () => {
    it("strips projectRoot from absolute document paths", () => {
      const path = manager.cachePathFor(join(projectRoot, "roles", "my-role.md"));

      expect(path).toBe(join(cacheRoot, "roles", "my-role.json"));
    });

    it("handles nested source directories", () => {
      const path = manager.cachePathFor(join(projectRoot, "content", "roles", "test.md"));

      expect(path).toBe(join(cacheRoot, "content", "roles", "test.json"));
    });

    it("uses relative paths as-is when no projectRoot match", () => {
      const path = manager.cachePathFor("roles/my-role.md");

      expect(path).toBe(join(cacheRoot, "roles", "my-role.json"));
    });
  });

  describe("write() and read()", () => {
    const hash = "abcd1234";
    const result = {
      compliant: true,
      issues: [] as string[],
      reason: "All good",
    };
    const metadata = {
      documentType: "role",
      specPath: "roles/README.md",
    };

    it("writes and reads back a cached result", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      manager.write({ documentPath, contentHash: hash, result, metadata });
      const cached = manager.read({ documentPath, contentHash: hash });

      expect(cached).toEqual(result);
    });

    it("returns null for non-existent cache entries", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      const cached = manager.read({ documentPath, contentHash: "nonexist" });

      expect(cached).toBeNull();
    });

    it("returns null when hash does not match", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      manager.write({ documentPath, contentHash: hash, result, metadata });
      const cached = manager.read({ documentPath, contentHash: "different" });

      expect(cached).toBeNull();
    });

    it("preserves severity field through serialization", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      const failResult = {
        compliant: false,
        issues: ["Missing section"],
        reason: "No — missing required section",
        severity: "error" as const,
      };

      manager.write({ documentPath, contentHash: hash, result: failResult, metadata });
      const cached = manager.read({ documentPath, contentHash: hash });

      expect(cached?.severity).toBe("error");
    });
  });

  describe("stats()", () => {
    it("returns zero counts for empty cache", () => {
      const stats = manager.stats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it("counts cache files after writes", () => {
      manager.write({
        documentPath: join(projectRoot, "roles", "a.md"),
        contentHash: "aaaa1111",
        result: { compliant: true, issues: [], reason: "ok" },
        metadata: { documentType: "role", specPath: "roles/README.md" },
      });
      manager.write({
        documentPath: join(projectRoot, "roles", "b.md"),
        contentHash: "bbbb2222",
        result: { compliant: true, issues: [], reason: "ok" },
        metadata: { documentType: "role", specPath: "roles/README.md" },
      });

      const stats = manager.stats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.byType["roles"]).toBe(2);
    });
  });

  describe("orphanedCacheFiles()", () => {
    it("identifies cache files for deleted documents", () => {
      mkdirSync(join(projectRoot, "roles"), { recursive: true });
      writeFileSync(join(projectRoot, "roles", "README.md"), "# Roles");

      // Write a cache entry for a document that doesn't exist
      manager.write({
        documentPath: join(projectRoot, "roles", "deleted-role.md"),
        contentHash: "dead1234",
        result: { compliant: true, issues: [], reason: "ok" },
        metadata: { documentType: "role", specPath: "roles/README.md" },
      });

      const orphans = manager.orphanedCacheFiles(projectRoot, ["roles"]);

      expect(orphans.length).toBe(1);
      expect(orphans[0].reason).toBe("document_missing");
      expect(orphans[0].docName).toBe("deleted-role");
    });
  });

  describe("readRaw()", () => {
    const hash = "abcd1234";
    const result = {
      compliant: true,
      issues: [] as string[],
      reason: "All good",
    };
    const metadata = {
      documentType: "role",
      specPath: "roles/README.md",
    };

    it("returns full cache data without hash validation", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      manager.write({ documentPath, contentHash: hash, result, metadata });
      const cached = manager.readRaw({ documentPath });

      expect(cached).not.toBeNull();
      expect(cached!.version).toBe("1.0");
      expect(cached!.content_hash).toBe(hash);
      expect(cached!.cached_at).toBeTruthy();
      expect(cached!.document.path).toBe(documentPath);
      expect(cached!.document.type).toBe("role");
      expect(cached!.document.spec_path).toBe("roles/README.md");
      expect(cached!.result).toEqual(result);
    });

    it("returns null when no cache file exists", () => {
      const documentPath = join(projectRoot, "roles", "nonexistent.md");
      const cached = manager.readRaw({ documentPath });

      expect(cached).toBeNull();
    });

    it("returns data even when hash would not match read()", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      manager.write({ documentPath, contentHash: hash, result, metadata });

      const readResult = manager.read({ documentPath, contentHash: "different" });
      expect(readResult).toBeNull();

      const rawResult = manager.readRaw({ documentPath });
      expect(rawResult).not.toBeNull();
      expect(rawResult!.content_hash).toBe(hash);
    });

    it("does not delete corrupt cache files", () => {
      const documentPath = join(projectRoot, "roles", "corrupt.md");
      const cachePath = manager.cachePathFor(documentPath);
      mkdirSync(dirname(cachePath), { recursive: true });
      writeFileSync(cachePath, "not valid json{{{");

      const cached = manager.readRaw({ documentPath });
      expect(cached).toBeNull();
      expect(existsSync(cachePath)).toBe(true);
    });
  });

  describe("text sanitization", () => {
    const metadata = { documentType: "role", specPath: "roles/README.md" };

    it("strips control characters and double quotes from reason and issues", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      const hash = "abcd1234";
      const result = {
        compliant: false,
        issues: ['issue with \x00 null byte and "quotes"'],
        reason: 'No \x01\x02\x03 — bad chars here\x00 and "quoted text"',
        severity: "error" as const,
      };

      manager.write({ documentPath, contentHash: hash, result, metadata });
      const cached = manager.read({ documentPath, contentHash: hash });

      expect(cached).not.toBeNull();
      expect(cached!.reason).not.toContain("\x00");
      expect(cached!.reason).not.toContain("\x01");
      expect(cached!.reason).not.toContain('"');
      expect(cached!.reason).toContain("'quoted text'");
      expect(cached!.issues[0]).not.toContain("\x00");
      expect(cached!.issues[0]).not.toContain('"');
    });

    it("preserves newlines and tabs in reason text", () => {
      const documentPath = join(projectRoot, "roles", "test-role.md");
      const hash = "abcd1234";
      const result = {
        compliant: true,
        issues: [] as string[],
        reason: "Yes\n\tAll good\nNo issues",
      };

      manager.write({ documentPath, contentHash: hash, result, metadata });
      const cached = manager.read({ documentPath, contentHash: hash });

      expect(cached!.reason).toContain("\n");
      expect(cached!.reason).toContain("\t");
    });
  });
});
