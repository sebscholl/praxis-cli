import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { Command } from "commander";

import { Logger } from "@/core/logger.js";
import { SCAFFOLD_FILES } from "@/scaffold/templates.js";

/**
 * Registers the `praxis init` command.
 *
 * Scaffolds a new Praxis project by writing framework files,
 * placeholder content, and the Claude Code plugin structure
 * into the target directory.
 */
export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new Praxis project")
    .argument("[directory]", "target directory (defaults to current directory)", ".")
    .action(async (directory: string) => {
      const logger = new Logger();
      const targetDir = resolve(directory);

      try {
        initProject(targetDir, logger);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Writes all scaffold files into the target directory.
 *
 * Creates the directory structure as needed. Skips files that
 * already exist to avoid overwriting user content. Logs each
 * created file and prints next-steps guidance when complete.
 *
 * @param targetDir - Absolute path to the project root
 * @param logger - Logger instance for output
 */
export function initProject(targetDir: string, logger: Logger): void {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  let created = 0;
  let skipped = 0;

  for (const file of SCAFFOLD_FILES) {
    const fullPath = join(targetDir, file.path);
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (existsSync(fullPath)) {
      skipped++;
      continue;
    }

    writeFileSync(fullPath, file.content);
    logger.success(`Created ${file.path}`);
    created++;
  }

  // Create empty agents directory for compile output
  const agentsDir = join(targetDir, "plugins", "praxis", "agents");
  if (!existsSync(agentsDir)) {
    mkdirSync(agentsDir, { recursive: true });
  }

  console.log();
  logger.info(`Initialized Praxis project: ${created} files created, ${skipped} skipped`);
  console.log();
  console.log("Next steps:");
  console.log("  1. Edit content/context/constitution/ to define your organization's identity");
  console.log("  2. Edit content/context/conventions/ to document your standards");
  console.log("  3. Run `praxis compile` to generate agent files");
  console.log("  4. Define new roles in content/roles/ as your organization grows");
}
