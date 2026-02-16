import { Command } from "commander";

import { registerCompileCommand } from "@/commands/compile.js";
import { registerInitCommand } from "@/commands/init.js";
import { registerValidateCommand } from "@/commands/validate.js";

/** CLI version, kept in sync with package.json. */
const VERSION = "1.0.0";

/**
 * Creates and configures the root CLI program.
 *
 * Wires all subcommands (init, compile, validate) and
 * provides top-level --version / --help flags.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("praxis")
    .description("CLI for the Praxis knowledge framework")
    .version(VERSION);

  registerInitCommand(program);
  registerCompileCommand(program);
  registerValidateCommand(program);

  return program;
}

const program = createProgram();
program.parse();
