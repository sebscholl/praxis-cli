# Praxis

**A knowledge framework for humans and AI agents.**

Praxis is a CLI tool that structures your team's knowledge so both humans and AI agents can operate effectively. It treats agents as first-class contributors — not tools to be prompted, but workers to be onboarded, given roles, and delegated responsibilities.

The premise is simple: **if you can't clearly explain how your organization works to a new team member, you can't effectively delegate to an agent.** Praxis forces that clarity.

## Install

```bash
npm install -g praxis-cli
```

Requires Node.js 18+.

## Quick Start

```bash
# Scaffold a new Praxis project
praxis init my-org
cd my-org

# Add a role and responsibility
praxis add role code-reviewer
praxis add responsibility review-pull-requests

# Edit the generated files, then compile
praxis compile
```

Compiled agent profiles are written to `agent-profiles/` by default.

## How It Works

Praxis organizes knowledge into four primitives:

| Primitive | Purpose | Example |
|-----------|---------|---------|
| **Context** | "This is who we are and how we think" | Company identity, conventions, mental models |
| **Roles** | "This is who you are" | A role definition with scope, boundaries, and personality |
| **Responsibilities** | "This is what you own" | Discrete units of work delegated to a role |
| **Reference** | "This is what things mean" | Vocabulary, indices, lookup tables |

A **Role** is the central unit. Each role declares what context it needs, what responsibilities it owns, and what references it consults. When you run `praxis compile`, it reads each role's frontmatter manifest, inlines all referenced content, and produces a single standalone markdown file — a compiled agent profile.

```
content/
├── context/
│   ├── constitution/       # Who you are (identity, principles)
│   ├── conventions/        # How you do things (standards, norms)
│   └── lenses/             # How you think (mental models)
├── roles/                  # Role definitions
├── responsibilities/       # Delegatable work units
└── reference/              # Definitions, indices, templates
```

## CLI Reference

### `praxis init [directory]`

Scaffolds a new Praxis project with the full directory structure, two built-in roles (Stewart and Remy), and starter content. Skips files that already exist, making it safe to re-run.

### `praxis add role <name>` / `praxis add responsibility <name>`

Creates a new role or responsibility from the `_template.md` with placeholders pre-filled. The name should be kebab-case (e.g., `code-reviewer`, `review-pull-requests`).

```bash
praxis add role code-reviewer
# Creates content/roles/code-reviewer.md

praxis add responsibility review-pull-requests
# Creates content/responsibilities/review-pull-requests.md
```

### `praxis compile [--alias <name>] [--watch]`

Compiles all roles (or a single role by alias) into agent profiles. Each role's referenced content is inlined into a self-contained markdown file.

```bash
praxis compile                    # Compile all roles
praxis compile --alias stewart    # Compile a single role
praxis compile --watch            # Compile and watch for changes
```

The `--watch` flag monitors `content/` for file changes and automatically recompiles.

### `praxis status`

Shows a project health dashboard without requiring any API keys. Reports content counts and identifies issues like dangling references, orphaned responsibilities, missing descriptions, and unmatched owners.

```bash
praxis status
```

Exits with code 1 if issues are found, making it suitable for CI.

### `praxis validate`

AI-powered validation that checks documents against their directory's README specification.

```bash
praxis validate document content/roles/my-role.md
praxis validate all [--type <type>] [--verbose] [--fail-fast]
praxis validate ci [--strict]
```

Requires an [OpenRouter](https://openrouter.ai) API key:

```bash
export OPENROUTER_API_KEY=your-key-here
```

## Role Frontmatter

A role's frontmatter is its manifest — it declares everything the compiler needs to assemble the agent profile:

```yaml
---
title: Code Reviewer
alias: reviewer
description: Reviews pull requests against team conventions
constitution: true
context:
  - content/context/conventions/*.md
responsibilities:
  - content/responsibilities/review-pull-requests.md
refs:
  - content/reference/architecture-decisions.md
---
```

| Key | Purpose |
|-----|---------|
| `alias` | Short name used for the compiled filename and `--alias` flag |
| `description` | What this agent does (used by plugins for agent metadata) |
| `constitution` | Set to `true` to include all `content/context/constitution/*.md` files |
| `context` | Additional context files (supports glob patterns) |
| `responsibilities` | Responsibility files this role owns |
| `refs` | Reference files to include |

## Configuration

`praxis.config.json` at the project root controls compilation output:

```json
{
  "agentProfilesDir": "./agent-profiles",
  "plugins": []
}
```

- **`agentProfilesDir`**: Where pure agent profiles are written. Set to `false` to disable.
- **`plugins`**: Array of output plugins to enable.

## Claude Code Plugin

Add `"claude-code"` to the `plugins` array to generate Claude Code agent files with frontmatter:

```json
{
  "agentProfilesDir": "./agent-profiles",
  "plugins": ["claude-code"]
}
```

Run `praxis init` again after enabling the plugin to scaffold the Claude Code plugin files (`.claude-plugin/`, `plugins/praxis/`).

The plugin reads additional frontmatter fields from your role files to customize the generated Claude Code agents:

| Frontmatter Field | Claude Code Output | Example |
|-------------------|--------------------|---------|
| `agent_tools` | `tools` | `Read, Glob, Grep` |
| `agent_model` | `model` | `opus`, `sonnet` |
| `agent_permission_mode` | `permissionMode` | `plan`, `bypassPermissions` |

Example role with Claude Code fields:

```yaml
---
alias: Steve
description: "Use this agent to manage Linear projects and issues following company conventions."
agent_tools: Read, Glob, Grep
agent_model: opus
agent_permission_mode: plan
constitution: true
responsibilities:
  - content/responsibilities/explain-linear-issues.md
  - content/responsibilities/manage-linear-resources.md
---
```

This compiles to a Claude Code agent file at `plugins/praxis/agents/steve.md` with the appropriate frontmatter, alongside the pure profile at `agent-profiles/remy.md`.

## License

MIT
