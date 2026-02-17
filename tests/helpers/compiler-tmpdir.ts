import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

/** Resolved path to the tests/fixtures directory. */
const FIXTURES_ROOT = join(import.meta.dirname, "..", "fixtures");

/**
 * Creates a temporary directory pre-populated with test fixtures.
 *
 * Creates a fake project root with `.praxis/` marker, `content/` subdirectories,
 * copies all test fixtures into it, and writes a `.praxis/config.json`
 * that enables the claude-code plugin for backward-compatible test behavior.
 *
 * Returns an object with path accessors and a cleanup function.
 */
export function createCompilerTmpdir(): {
  tmpdir: string;
  rolesDir: string;
  responsibilitiesDir: string;
  contextDir: string;
  agentsOutputDir: string;
  agentProfilesDir: string;
  cleanup: () => void;
} {
  const dir = join(tmpdir(), `praxis-test-${randomUUID()}`);

  const rolesDir = join(dir, "content", "roles");
  const responsibilitiesDir = join(dir, "content", "responsibilities");
  const contextDir = join(dir, "content", "context");
  const agentsOutputDir = join(dir, "plugins", "praxis", "agents");
  const agentProfilesDir = join(dir, "agent-profiles");

  // Create structure
  mkdirSync(rolesDir, { recursive: true });
  mkdirSync(responsibilitiesDir, { recursive: true });
  mkdirSync(contextDir, { recursive: true });
  mkdirSync(join(dir, ".praxis"), { recursive: true });

  // Copy fixtures
  const contentSource = join(FIXTURES_ROOT, "content");
  if (existsSync(contentSource)) {
    cpSync(contentSource, join(dir, "content"), { recursive: true });
  }

  // Write config to .praxis/config.json
  writeFileSync(
    join(dir, ".praxis", "config.json"),
    JSON.stringify({
      sources: [
        "content/roles",
        "content/responsibilities",
        "content/reference",
        "content/context",
      ],
      rolesDir: "content/roles",
      responsibilitiesDir: "content/responsibilities",
      agentProfilesOutputDir: "./agent-profiles",
      pluginsOutputDir: "./plugins",
      plugins: ["claude-code"],
    }),
  );

  return {
    tmpdir: dir,
    rolesDir,
    responsibilitiesDir,
    contextDir,
    agentsOutputDir,
    agentProfilesDir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
