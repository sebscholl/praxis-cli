import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

/** Resolved path to the tests/fixtures directory. */
const FIXTURES_ROOT = join(import.meta.dirname, "..", "fixtures");

/**
 * Creates a temporary directory pre-populated with test fixtures.
 *
 * Mirrors the Ruby `compiler_tmpdir` shared context. Creates a fake
 * project root with `content/` subdirectories, and copies
 * all test fixtures into it. Returns an object with path accessors
 * and a cleanup function.
 */
export function createCompilerTmpdir(): {
  tmpdir: string;
  rolesDir: string;
  responsibilitiesDir: string;
  contextDir: string;
  agentsOutputDir: string;
  cleanup: () => void;
} {
  const dir = join(tmpdir(), `praxis-test-${randomUUID()}`);

  const rolesDir = join(dir, "content", "roles");
  const responsibilitiesDir = join(dir, "content", "responsibilities");
  const contextDir = join(dir, "content", "context");
  const agentsOutputDir = join(dir, "plugins", "praxis", "agents");

  // Create structure
  mkdirSync(rolesDir, { recursive: true });
  mkdirSync(responsibilitiesDir, { recursive: true });
  mkdirSync(contextDir, { recursive: true });
  mkdirSync(agentsOutputDir, { recursive: true });

  // Copy fixtures
  const contentSource = join(FIXTURES_ROOT, "content");
  if (existsSync(contentSource)) {
    cpSync(contentSource, join(dir, "content"), { recursive: true });
  }

  return {
    tmpdir: dir,
    rolesDir,
    responsibilitiesDir,
    contextDir,
    agentsOutputDir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
