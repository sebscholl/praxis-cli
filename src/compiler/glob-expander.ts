import { basename } from "node:path";

import fg from "fast-glob";

/** Files excluded from glob expansion results. */
const EXCLUDED_FILES = ["_template.md", "README.md"];

/**
 * Expands glob patterns to matching file paths within a project root.
 *
 * Handles both glob patterns (containing `*`, `?`, or `[`) and plain
 * file paths. Always excludes `_template.md` and `README.md` from results.
 * Returns paths relative to the project root, sorted alphabetically.
 */
export class GlobExpander {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  /**
   * Expands a single pattern to matching relative file paths.
   *
   * If the pattern is not a glob (no wildcards), returns it unchanged
   * in a single-element array. Otherwise, expands against the filesystem,
   * excludes templates and READMEs, and returns sorted relative paths.
   *
   * @param pattern - A glob pattern or plain relative path
   */
  async expand(pattern: string): Promise<string[]> {
    if (!this.isGlob(pattern)) {
      return [pattern];
    }

    const matches = await fg(pattern, {
      cwd: this.root,
      onlyFiles: true,
    });

    return matches
      .filter((match) => !this.isExcluded(match))
      .sort();
  }

  /**
   * Expands multiple patterns and flattens results into a single array.
   *
   * @param patterns - Array of glob patterns or plain relative paths
   */
  async expandAll(patterns: string[]): Promise<string[]> {
    const results = await Promise.all(patterns.map((p) => this.expand(p)));
    return results.flat();
  }

  /** Checks whether a pattern contains glob wildcard characters. */
  isGlob(pattern: string): boolean {
    return pattern.includes("*") || pattern.includes("?") || pattern.includes("[");
  }

  /** Checks whether a file path ends with an excluded filename. */
  private isExcluded(filePath: string): boolean {
    const name = basename(filePath);
    return EXCLUDED_FILES.includes(name);
  }
}
