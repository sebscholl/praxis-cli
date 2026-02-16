import type { Command } from "commander";

import { Frontmatter } from "@/compiler/frontmatter.js";
import { RoleCompiler } from "@/compiler/role-compiler.js";
import { Logger } from "@/core/logger.js";
import { Paths } from "@/core/paths.js";

import fg from "fast-glob";

/**
 * Registers the `praxis compile` command.
 *
 * Compiles role definitions into standalone Claude Code agent
 * files by inlining all referenced content (responsibilities,
 * constitution, context, references).
 */
export function registerCompileCommand(program: Command): void {
  program
    .command("compile")
    .description("Compile role definitions into agent files")
    .option("--alias <name>", "compile a specific agent by alias")
    .action(async (options: { alias?: string }) => {
      const logger = new Logger();

      try {
        const paths = new Paths();
        const compiler = new RoleCompiler({ root: paths.root, logger });

        if (options.alias) {
          await compileOne(paths, compiler, logger, options.alias);
        } else {
          await compiler.compileAll();
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Compiles a single agent by looking up its role file via alias.
 *
 * Searches all role files in the roles directory for one whose
 * `alias` frontmatter field matches the target (case-insensitive).
 */
async function compileOne(
  paths: Paths,
  compiler: RoleCompiler,
  logger: Logger,
  aliasName: string,
): Promise<void> {
  const roleFile = await findRoleByAlias(paths.rolesDir, aliasName);

  if (!roleFile) {
    logger.error(`No role found with alias: ${aliasName}`);
    process.exit(1);
  }

  await compiler.compile(roleFile);
}

/**
 * Searches role files for one matching the given alias.
 *
 * @param rolesDir - Absolute path to the roles directory
 * @param targetAlias - The alias to search for (case-insensitive)
 * @returns The absolute path to the matching role file, or null
 */
async function findRoleByAlias(rolesDir: string, targetAlias: string): Promise<string | null> {
  const roleFiles = await fg("*.md", {
    cwd: rolesDir,
    onlyFiles: true,
    absolute: true,
  });

  for (const roleFile of roleFiles) {
    const fm = new Frontmatter(roleFile);
    const alias = fm.value("alias") as string | undefined;
    if (alias?.toLowerCase() === targetAlias.toLowerCase()) {
      return roleFile;
    }
  }

  return null;
}
