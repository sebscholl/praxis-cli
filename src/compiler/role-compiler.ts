import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import fg from "fast-glob";

import { Logger } from "@/core/logger.js";
import { Paths } from "@/core/paths.js";

import { Frontmatter } from "./frontmatter.js";
import { GlobExpander } from "./glob-expander.js";
import { Markdown } from "./markdown.js";
import { type AgentMetadata, OutputBuilder } from "./output-builder.js";

/** Files excluded when scanning the roles directory for compilation. */
const EXCLUDED_FILES = ["_template.md", "README.md"];

/**
 * Compiles role definition files into standalone Claude Code agent files.
 *
 * Reads a role's frontmatter manifest, resolves all referenced content
 * (constitution, context, responsibilities, references), inlines their
 * body content (stripping frontmatter), and writes a single self-contained
 * agent markdown file to the output directory.
 */
export class RoleCompiler {
  private readonly root: string;
  private readonly logger: Logger;
  private readonly globExpander: GlobExpander;

  constructor({
    root,
    logger = new Logger(),
  }: {
    root: string;
    logger?: Logger;
  }) {
    this.root = root;
    this.logger = logger;
    this.globExpander = new GlobExpander(root);
  }

  /**
   * Compiles a single role file into an agent output file.
   *
   * @param roleFile - Absolute path to the role markdown file
   * @param outputFile - Optional output path; defaults to agents dir using alias
   * @returns The output file path, or null if the role was skipped
   */
  async compile(roleFile: string, outputFile?: string): Promise<string | null> {
    const fm = new Frontmatter(roleFile);
    const roleAlias = fm.value("alias") as string | undefined;

    if (!roleAlias) {
      this.logger.warn(`No alias found in ${roleFile}, skipping`);
      return null;
    }

    const resolvedOutputFile = outputFile ?? this.defaultOutputPath(roleAlias);
    const relativeRole = this.relativePath(roleFile);
    const md = new Markdown(roleFile);
    const agentMetadata = this.buildAgentMetadata(fm, roleAlias);

    const builder = new OutputBuilder({ agentMetadata });

    builder.addRole(md.body());
    builder.addResponsibilities(await this.inlineRefs(fm, "responsibilities"));
    builder.addConstitution(await this.inlineConstitution(fm));
    builder.addContext(await this.inlineRefs(fm, "context"));
    builder.addReference(await this.inlineRefs(fm, "refs"));

    const outputDir = dirname(resolvedOutputFile);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    writeFileSync(resolvedOutputFile, builder.build());

    this.logger.success(`Compiled ${roleAlias.toLowerCase()}.md`);
    return resolvedOutputFile;
  }

  /**
   * Compiles all role files found in the project's roles directory.
   *
   * Skips `_template.md`, `README.md`, and roles without an alias.
   *
   * @returns Summary with the count of compiled agents
   */
  async compileAll(): Promise<{ compiled: number }> {
    const paths = new Paths(this.root);
    const agentsDir = paths.agentsDir;

    if (!existsSync(agentsDir)) {
      mkdirSync(agentsDir, { recursive: true });
    }

    const roleFiles = await fg("*.md", {
      cwd: paths.rolesDir,
      onlyFiles: true,
      absolute: true,
    });

    let compiled = 0;

    for (const roleFile of roleFiles) {
      const name = basename(roleFile);
      if (EXCLUDED_FILES.includes(name)) {
        continue;
      }

      const fm = new Frontmatter(roleFile);
      const roleAlias = fm.value("alias") as string | undefined;
      if (!roleAlias) {
        continue;
      }

      const outputFile = join(agentsDir, `${roleAlias.toLowerCase()}.md`);
      await this.compile(roleFile, outputFile);
      compiled++;
    }

    this.logger.info(`Compiled ${compiled} agent(s) (up-to-date)`);
    return { compiled };
  }

  /**
   * Derives the default output path for a compiled agent.
   *
   * @param roleAlias - The role's alias field from frontmatter
   */
  private defaultOutputPath(roleAlias: string): string {
    const paths = new Paths(this.root);
    return join(paths.agentsDir, `${roleAlias.toLowerCase()}.md`);
  }

  /**
   * Converts an absolute path to a path relative to the project root.
   */
  private relativePath(absolutePath: string): string {
    const prefix = this.root + "/";
    return absolutePath.startsWith(prefix) ? absolutePath.slice(prefix.length) : absolutePath;
  }

  /**
   * Resolves `constitution: true` to glob patterns matching all constitution files.
   *
   * @returns Array of relative paths to constitution files, or empty if not enabled
   */
  private async resolveConstitutionPatterns(fm: Frontmatter): Promise<string[]> {
    const raw = fm.parse()["constitution"];
    if (raw !== true) {
      return [];
    }
    return this.globExpander.expand("content/context/constitution/*.md");
  }

  /**
   * Reads and returns the body content of all constitution files.
   *
   * @returns Array of body strings with frontmatter stripped
   */
  private async inlineConstitution(fm: Frontmatter): Promise<string[]> {
    const expanded = await this.resolveConstitutionPatterns(fm);

    return expanded
      .map((relPath) => {
        const fullPath = join(this.root, relPath);
        if (!existsSync(fullPath)) {
          return null;
        }
        return new Markdown(fullPath).body();
      })
      .filter((body): body is string => body !== null);
  }

  /**
   * Expands frontmatter array references and inlines their body content.
   *
   * Used for responsibilities, context, and refs sections.
   *
   * @param fm - The parsed frontmatter
   * @param key - The frontmatter key to read (e.g. "responsibilities", "context", "refs")
   * @returns Array of body strings with frontmatter stripped
   */
  private async inlineRefs(fm: Frontmatter, key: string): Promise<string[]> {
    const patterns = fm.array(key) as string[];
    const expanded = await this.globExpander.expandAll(patterns);

    return expanded
      .map((relPath) => {
        const fullPath = join(this.root, relPath);
        if (!existsSync(fullPath)) {
          return null;
        }
        return new Markdown(fullPath).body();
      })
      .filter((body): body is string => body !== null);
  }

  /**
   * Builds Claude Code agent metadata from role frontmatter.
   *
   * Extracts the agent name (from alias), description, and optional
   * fields (tools, model, permission mode). Returns null if no
   * `agent_description` is provided.
   */
  private buildAgentMetadata(fm: Frontmatter, roleAlias: string): AgentMetadata | null {
    const name = roleAlias
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const description = fm.value("agent_description") as string | undefined;
    if (!description) {
      this.logger.warn("No agent_description found in role, skipping agent metadata");
      return null;
    }

    const metadata: AgentMetadata = { name, description };

    const tools = fm.value("agent_tools") as string | undefined;
    if (tools) metadata.tools = tools;

    const model = fm.value("agent_model") as string | undefined;
    if (model) metadata.model = model;

    const permissionMode = fm.value("agent_permission_mode") as string | undefined;
    if (permissionMode) metadata.permissionMode = permissionMode;

    return metadata;
  }
}
