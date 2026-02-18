# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-18

### Added

- **Per-plugin configuration** — Plugins now support object-form entries with plugin-specific options alongside the existing string shorthand. The `claude-code` plugin accepts `outputDir` (full path to output directory, resolved against project root) and `claudeCodePluginName` (name used in `plugin.json`).
- **Claude Code `plugin.json` management** — The Claude Code plugin now creates and maintains `.claude-plugin/plugin.json` inside the plugin output directory during compilation. Existing files are updated (only the `name` field), preserving user customizations.
- **Configurable validation settings** — New `validation` section in `.praxis/config.json` for specifying the API key environment variable name (`apiKeyEnvVar`) and OpenRouter model (`model`). No hardcoded fallback defaults — the scaffold provides initial values and `praxis validate` exits with a helpful error if the config is missing.

### Changed

- **Plugin config type** — `plugins` array entries can now be strings or `{ name, outputDir?, claudeCodePluginName? }` objects. Strings are internally normalized to `{ name: theString }`.
- **Claude Code plugin output** — Output directory defaults to `./plugins/praxis` but can be overridden per-plugin via `outputDir`. The `claudeCodePluginName` (default `"praxis"`) controls the `name` field in `plugin.json`.
- **Validation commands** — `praxis validate` now reads `apiKeyEnvVar` and `model` from `.praxis/config.json` instead of using hardcoded values.
- **Plugin scaffold structure** — Flattened `scaffold/plugins/claude-code/` (removed `plugin-name/` nesting). The `plugin.json` uses `{claudeCodePluginName}` as a template variable.
- **`praxis init` plugin scaffolding** — Copies plugin scaffold files into the resolved `outputDir` and templates `{claudeCodePluginName}` in JSON files.

### Removed

- **`pluginsOutputDir` config option** — Replaced by per-plugin `outputDir`. The global base directory setting is no longer needed.
- Hardcoded `OPENROUTER_API_KEY` env var name and `x-ai/grok-4.1-fast` model in the validator.

## [1.1.0] - 2026-02-17

### Added

- **Configurable directory structure** — Project layout is now fully driven by `.praxis/config.json` instead of hardcoded paths. New config fields: `sources`, `rolesDir`, `responsibilitiesDir`.
- **Source-based validation** — `BatchValidator` dynamically discovers validation domains by scanning configured `sources` directories for `README.md` specs, replacing the hardcoded 5-type lookup.
- **Root-relative cache paths** — `CacheManager` accepts an optional `projectRoot` for computing cache paths, replacing the brittle `/content/` string-splitting logic.
- **Multi-directory watch** — `praxis compile --watch` now creates one file watcher per source directory instead of watching a single `content/` folder.
- **New `Paths` tests** — Added `tests/core/paths.test.ts` for root detection behavior.

### Changed

- **Project root marker** — Root detection changed from looking for `content/` to looking for `.praxis/` directory.
- **Config location** — Moved from `{root}/praxis.config.json` to `{root}/.praxis/config.json`. The file is now simply `config.json` since it lives inside the `.praxis/` directory.
- **Scaffold structure flattened** — `scaffold/core/content/roles/`, `scaffold/core/content/responsibilities/`, etc. moved to `scaffold/core/roles/`, `scaffold/core/responsibilities/`, etc. The `content/` nesting layer is removed entirely.
- **`agentProfilesDir` renamed to `agentProfilesOutputDir`** — Clarifies that this is an output directory. Config field, getter, and all references updated.
- **Plugin output directory** — Claude Code plugin now appends `praxis/agents/` within the configured `pluginsOutputDir` base directory, rather than receiving the full path.
- **`constitution: true` deprecated** — Role frontmatter `constitution` field now expects an array of glob patterns (e.g., `["context/constitution/*.md"]`). Using `constitution: true` logs a deprecation warning and resolves to zero files.
- **`DocumentValidator.findReadme()`** — Only looks for `README.md` in the same directory as the document. Parent directory fallback removed.
- **`orphanedCacheFiles()` signature** — Now accepts `(root, sources)` instead of `(contentDir)`, scanning configured source directories dynamically.
- **Template placeholders** — All template placeholders unified to `{curly}` style (previously mixed `{curly}` and `[bracket]`). The `fillTemplate` function simplified accordingly.
- **`praxis add` output paths** — Files are created at config-driven locations (e.g., `roles/code-reviewer.md`) instead of hardcoded `content/roles/code-reviewer.md`.
- **`praxis status`** — Now scans all configured `sources` directories and uses frontmatter `type:` field for categorization instead of path-based inference.
- **Documentation** — README.md, CLAUDE.md, and all scaffold READMEs updated to reflect the new structure, config schema, and conventions.

### Removed

- `Paths.contentDir` getter — Callers now use `config.sources`.
- `Paths.rolesDir` getter — Callers now use `config.rolesDir`.
- `Paths.agentsDir` getter — Callers now use plugin-specific output directories.
- `scaffold/core/content/` directory — Replaced by top-level `scaffold/core/roles/`, `scaffold/core/responsibilities/`, etc.
- `scaffold/core/praxis.config.json` — Replaced by `scaffold/core/.praxis/config.json`.
- Hardcoded `DOCUMENT_TYPES` constant in `BatchValidator`.
- Hardcoded 5-type directory map in `CacheManager.buildDocumentMap()`.

## [1.0.1] - 2026-02-16

### Fixed

- Remove content hash from cache filenames to prevent unbounded cache growth.
- Sanitize LLM-generated text (strip control characters, escape quotes) before writing cache JSON.

### Changed

- Fix lint errors and update template placeholders.
- Publish as `@zarpay/praxis-cli`.

## [1.0.0] - 2026-02-16

### Added

- **Compiler pipeline** — Compiles role `.md` files with YAML frontmatter into self-contained agent profiles. Resolves responsibilities, constitution, context, and reference via glob patterns.
- **Validator pipeline** — AI-powered document validation against directory README specs via OpenRouter API. Includes content-hash caching in `.praxis/cache/validation/`.
- **Plugin system** — Extensible compilation output. Ships with Claude Code plugin that wraps profiles with agent frontmatter.
- **CLI commands:**
  - `praxis init [directory]` — Scaffold a new Praxis project.
  - `praxis compile [--alias <name>] [--watch]` — Compile roles into agent profiles.
  - `praxis add role|responsibility <name>` — Create content from templates.
  - `praxis status` — Project health dashboard.
  - `praxis validate document|all|ci` — AI-powered document validation.
- Scaffold with two built-in roles (Praxis Steward, Praxis Recruiter) and starter content.
- Project root detection via directory marker.
- `praxis.config.json` with `agentProfilesDir` and `plugins` options.

[1.2.0]: https://github.com/zarpay/praxis-cli/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/zarpay/praxis-cli/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/zarpay/praxis-cli/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/zarpay/praxis-cli/releases/tag/v1.0.0
