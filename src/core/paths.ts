import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Resolves standard directory paths within a Praxis project.
 *
 * Finds the project root by walking up the filesystem until a `.git`
 * directory is found, then derives all standard content and output paths
 * relative to that root.
 */
export class Paths {
  private readonly startDir: string;
  private cachedRoot: string | null = null;

  constructor(startDir: string = process.cwd()) {
    this.startDir = startDir;
  }

  /** The project root directory (parent of `.git`). */
  get root(): string {
    if (!this.cachedRoot) {
      this.cachedRoot = this.findRoot();
    }
    return this.cachedRoot;
  }

  /** The `content/` directory containing all Praxis primitives. */
  get contentDir(): string {
    return join(this.root, "content");
  }

  /** The `content/roles/` directory containing role definitions. */
  get rolesDir(): string {
    return join(this.root, "content", "roles");
  }

  /** The `plugins/praxis/agents/` directory for compiled agent output. */
  get agentsDir(): string {
    return join(this.root, "plugins", "praxis", "agents");
  }

  /**
   * Resolves a relative path against the project root.
   *
   * @param relativePath - Path relative to the project root
   */
  resolve(relativePath: string): string {
    return join(this.root, relativePath);
  }

  /**
   * Converts an absolute path to a path relative to the project root.
   *
   * @param absolutePath - Absolute filesystem path
   */
  relative(absolutePath: string): string {
    const prefix = this.root + "/";
    if (absolutePath.startsWith(prefix)) {
      return absolutePath.slice(prefix.length);
    }
    return absolutePath;
  }

  /**
   * Walks up from startDir to find the nearest `.git` directory.
   *
   * @throws Error if no `.git` directory is found before reaching filesystem root
   */
  private findRoot(): string {
    let current = resolve(this.startDir);

    for (;;) {
      if (existsSync(join(current, ".git"))) {
        return current;
      }

      const parent = dirname(current);
      if (parent === current) {
        throw new Error("Could not find praxis root (no .git directory found)");
      }

      current = parent;
    }
  }
}
