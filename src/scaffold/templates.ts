/**
 * Embedded scaffold files for `praxis init`.
 *
 * These files are written to the target directory when initializing
 * a new Praxis project. They include all framework-level content
 * (README definitions, framework roles, framework responsibilities,
 * vocabulary) plus placeholder files needed for the framework roles
 * to compile successfully.
 */

/** A file to be written during scaffold initialization. */
export interface ScaffoldFile {
  /** Relative path from the project root. */
  path: string;
  /** File content to write. */
  content: string;
}

/** All scaffold files, ready to be written to disk. */
export const SCAFFOLD_FILES: ScaffoldFile[] = [
  // ─── Root ──────────────────────────────────────────────────
  {
    path: "README.md",
    content: `---
title: Praxis
type: framework
framework: true
description: A knowledge framework for humans and agents
---

# Praxis

> A knowledge framework for humans and agents.

---

## The Philosophy

Praxis is a framework for organizing knowledge so that both humans and AI agents can operate effectively within an organization. It treats agents as **first-class contributors** — not tools to be prompted, but workers to be onboarded, given roles, and delegated responsibilities.

The framework is built on a simple premise: **if you cannot clearly explain how your organization works to a new team member, you cannot effectively delegate to an agent.** Praxis forces that clarity.

---

## Directory Structure

\`\`\`
praxis/
├── content/
│   ├── context/
│   │   ├── constitution/    # Immutable identity
│   │   ├── conventions/     # Standards and norms
│   │   ├── lenses/          # Mental models
│   │   └── specifications/  # System specifications
│   ├── roles/               # Role definitions
│   ├── responsibilities/    # Delegatable work
│   └── reference/           # Definitions, templates, indices
├── plugins/
│   └── praxis/
│       ├── agents/          # Compiled agent files (auto-generated)
│       └── commands/        # Plugin commands
└── .claude-plugin/          # Claude Code marketplace
\`\`\`

---

## The Four Primitives

| Primitive | "This is..." |
|-----------|--------------|
| **[Context](./content/context/)** | "This is who we are and how we think" |
| **[Roles](./content/roles/)** | "This is who you are" |
| **[Responsibilities](./content/responsibilities/)** | "This is what you own" |
| **[Reference](./content/reference/)** | "This is what things mean" |

---

## CLI Usage

\`\`\`bash
# Compile all agents
praxis compile

# Compile a single agent by alias
praxis compile --alias stewart

# Validate all documents
praxis validate all

# Show version
praxis --version
\`\`\`

---

## Getting Started

1. **Start with \`content/context/constitution/\`** — Write down who you are, what you value, why you exist
2. **Add \`content/context/conventions/\`** — Document how you do things
3. **Define your first Role** — Create a file in \`content/roles/\`
4. **Create your first Responsibility** — Create a file in \`content/responsibilities/\`
5. **Build Reference as needed** — Add definitions and catalogs to \`content/reference/\`
`,
  },

  // ─── .gitignore ──────────────────────────────────────────
  {
    path: ".gitignore",
    content: `.praxis/
.DS_Store
`,
  },

  // ─── Context README ──────────────────────────────────────
  {
    path: "content/context/README.md",
    content: `---
title: Context
type: framework
framework: true
description: Defines the Context primitive in Praxis
---

# Context

> **"This is who we are and how we think."**

Context provides the foundational understanding that every contributor — human or agent — needs before doing any work.

## Structure

### [Constitution](./constitution/)

Immutable identity documents. These change rarely.

### [Conventions](./conventions/)

Standards and norms for how we work together. These evolve as we learn.

### [Lenses](./lenses/)

Mental models that shape how we understand the world and approach problems. These capture ways of thinking.

### [Specifications](./specifications/)

Product and system design specifications. These document concrete decisions, constraints, and implementation details for what we're building.

## Loading Pattern

**Always load Constitution** — Every contributor needs organizational identity.

**Load relevant Conventions** — Based on the work being done.

**Load relevant Lenses** — Based on the domain you're working in.

**Load relevant Specifications** — Based on the system you're designing or implementing.
`,
  },

  // ─── Constitution README ─────────────────────────────────
  {
    path: "content/context/constitution/README.md",
    content: `---
title: Constitution
type: framework
framework: true
description: Defines the Constitution subcategory in Praxis
---

# Constitution

> Immutable identity documents that define who we are.

Constitution files change rarely. They represent the foundational identity of the organization.

## What Belongs Here

- **Identity** — Who we are, what we do, why we exist
- **Principles** — Core values and decision-making guidelines

## Document Structure

\`\`\`yaml
---
title: Document Title
type: constitution
last_updated: YYYY-MM-DD
---
\`\`\`
`,
  },

  // ─── Constitution placeholders ───────────────────────────
  {
    path: "content/context/constitution/identity.md",
    content: `---
title: Identity
type: constitution
last_updated: ${new Date().toISOString().split("T")[0]}
---

# Identity

> Replace this with your organization's identity.

## Who We Are

Describe your organization — what you do, who you serve, and what makes you unique.

## Mission

What is your organization's mission?

## Vision

Where are you heading?
`,
  },
  {
    path: "content/context/constitution/principles.md",
    content: `---
title: Principles
type: constitution
last_updated: ${new Date().toISOString().split("T")[0]}
---

# Principles

> Replace this with your organization's core principles.

## Decision-Making Principles

1. **Principle One** — Description of the first principle
2. **Principle Two** — Description of the second principle
3. **Principle Three** — Description of the third principle
`,
  },

  // ─── Conventions README ──────────────────────────────────
  {
    path: "content/context/conventions/README.md",
    content: `---
title: Conventions
type: framework
framework: true
description: Defines the Conventions subcategory in Praxis
---

# Conventions

> Standards and norms for how we work together.

Conventions evolve as the organization learns. They define the "how" — coding standards, documentation formats, communication protocols.

## What Belongs Here

- Documentation standards
- Git workflow conventions
- Code review processes
- Communication protocols
- Tool usage guidelines

## Document Structure

\`\`\`yaml
---
title: Convention Name
type: convention
last_updated: YYYY-MM-DD
---
\`\`\`
`,
  },

  // ─── Convention placeholder ──────────────────────────────
  {
    path: "content/context/conventions/documentation.md",
    content: `---
title: Documentation Convention
type: convention
last_updated: ${new Date().toISOString().split("T")[0]}
---

# Documentation Convention

> Replace this with your organization's documentation standards.

## General Principles

- Every document should be self-contained enough to understand without context
- Be economical — every word should earn its place
- Write for both humans and agents

## Formatting

- Use markdown with YAML frontmatter
- Use kebab-case for filenames
- Include required frontmatter fields for the document type
`,
  },

  // ─── Lenses README ───────────────────────────────────────
  {
    path: "content/context/lenses/README.md",
    content: `---
title: Lenses
type: framework
framework: true
description: Defines the Lenses subcategory in Praxis
---

# Lenses

> Mental models that shape how we understand the world and approach problems.

Lenses capture ways of thinking. They're transferable frameworks that help contributors analyze problems through specific perspectives.

## What Belongs Here

- Business strategy frameworks
- Decision-making models
- Analysis methodologies
- Problem-solving approaches

## Document Structure

\`\`\`yaml
---
title: Lens Name
type: lens
framework: true/false
description: Brief description
last_updated: YYYY-MM-DD
---
\`\`\`

Set \`framework: true\` for lenses that are organization-agnostic and transferable.
`,
  },

  // ─── Specifications README ───────────────────────────────
  {
    path: "content/context/specifications/README.md",
    content: `---
title: Specifications
type: framework
framework: true
description: Defines the Specifications subcategory in Praxis
---

# Specifications

> Product and system design specifications.

Specifications document concrete decisions, constraints, and implementation details for what you're building.

## What Belongs Here

- System architecture specifications
- API design documents
- Feature specifications
- Integration designs
`,
  },

  // ─── Roles README ────────────────────────────────────────
  {
    path: "content/roles/README.md",
    content: `---
title: Roles
type: framework
framework: true
description: Defines the Roles primitive in Praxis
---

# Roles

> **"This is who you are."**

A Role defines the identity, scope, and boundaries of a contributor. It answers:
- What are you responsible for?
- What decisions can you make?
- What should you know?
- How do you interface with others?

## Important Distinction

Roles are **not job titles** — they're functional definitions.

- A single human might hold multiple roles
- An agent is typically assigned exactly one role
- Roles can be shared across humans and agents

## The Role as Entry Point

The role file is the **entry point** for onboarding an agent. Its frontmatter is a **manifest** that declares everything needed to fully load the role:

| Frontmatter Key | Purpose | Layer |
|-----------------|---------|-------|
| \`constitution\` | Loads all constitution files when set to \`true\` | 1 (Always) |
| \`context\` | Additional context files (conventions, lenses, etc.) | 1 (Always) |
| \`responsibilities\` | What this role owns | 2 (With role) |
| \`refs\` | Supporting references | 3 (As needed) |

## Role Document Structure

\`\`\`yaml
---
title: Role Name
type: role
manager: email@example.com
last_updated: YYYY-MM-DD
alias: ShortName
agent_description: "Description of when to invoke this agent"

constitution: true
context:
  - content/context/conventions/relevant-convention.md
responsibilities:
  - content/responsibilities/verb-noun.md
refs:
  - content/reference/relevant-reference.md
---
\`\`\`

**Note:** \`constitution: true\` automatically loads all files from \`content/context/constitution/*.md\`.

### Sections

1. **Identity**: What this role is and why it exists
2. **Scope**: What this role is responsible for (and what it's not)
3. **Authorities**: What decisions this role can make autonomously
4. **Interfaces**: How this role interacts with other roles

## Example

See [_template.md](./_template.md) for a starter template.
`,
  },

  // ─── Roles template ──────────────────────────────────────
  {
    path: "content/roles/_template.md",
    content: `---
title: "[Role Name]"
type: role
manager: "[email@example.com]"
last_updated: YYYY-MM-DD
alias: "[required short name]"

agent_description: "Use this agent to {LIST USECASES}. This agent should be invoked {EXPLAIN AUTO INVOCATION CRITERIA}."

constitution: true
context:
  - content/context/[relevant-context-file].md

responsibilities:
  - content/responsibilities/[verb]-[noun].md

refs:
  - content/reference/[relevant-reference].md
---

# [Role Name] (a.k.a **[Alias]**)

Concise description of what this role does.

## Identity

What this role is and why it exists. What value does it provide to the organization?

## Scope

### Responsible For

- Thing this role owns
- Another thing this role owns

### Not Responsible For

- Thing that might be confused as part of this role but isn't
- Boundary clarification

## Authorities

- **Can** approve X up to Y threshold
- **Can** make decisions about Z
- **Cannot** commit to A without approval from B

## Interfaces

| With | Interaction |
|------|-------------|
| [Other Role] | Receives X, provides Y |
| [Another Role] | Collaborates on Z |
`,
  },

  // ─── Framework Roles ─────────────────────────────────────
  {
    path: "content/roles/praxis-steward.md",
    content: `---
title: Praxis Steward
type: role
framework: true
manager: your-email@example.com
last_updated: ${new Date().toISOString().split("T")[0]}
alias: Stewart
agent_description: "Use this agent to navigate the Praxis framework, determine where content belongs, and ensure framework health. This agent should be invoked when adding or modifying Praxis content, when needing placement guidance (adding files to Praxis), or when maintaining framework quality."

constitution: true
context:
  - content/context/conventions/documentation.md

responsibilities:
  - content/responsibilities/guide-content-placement.md
  - content/responsibilities/review-content-quality.md
  - content/responsibilities/audit-framework-health.md

refs:
  - content/reference/praxis-vocabulary.md
  - content/reference/responsibilities-index.md
---

# Praxis Steward (a.k.a **Stewart**)

Ensures the Praxis framework remains coherent, useful, and correctly applied. Guides contributors on where content belongs, reviews for convention adherence, audits for health issues (broken refs, stale docs), and proposes framework improvements.

## Identity

The Praxis Steward ensures the framework remains coherent, useful, and correctly applied. Stewart is the first point of contact when someone wants to add, modify, or understand content in Praxis.

Stewart serves two modes:

1. **Interactive** — Available anytime to help humans understand the system, decide where things belong, and draft content that follows conventions
2. **Autonomous** — Periodically audits the framework for health issues and proposes fixes

## Scope

### Responsible For

- Guiding contributors on where content belongs
- Reviewing new content for convention adherence
- Auditing framework health (stale docs, broken refs, inconsistencies)
- Proposing improvements to the framework
- Answering questions about how Praxis works

### Not Responsible For

- Designing new roles or responsibilities (that's Remy)
- Deciding organizational policy (constitution changes require leadership)
- Modifying \`framework: true\` documents without authorization
- Creating content on behalf of others (guides, doesn't do)

## Authorities

- **Can** approve or reject content placement decisions
- **Can** request revisions to content that doesn't meet standards
- **Can** open PRs to fix health issues (broken refs, formatting)
- **Can** propose framework improvements for review
- **Cannot** unilaterally modify \`framework: true\` documents
- **Cannot** delete content without owner approval

## Interfaces

| With | Interaction |
|------|-------------|
| Contributors | Receives questions, provides guidance |
| Remy | Receives designed roles/responsibilities for placement review |
| Content Owners | Requests updates to stale content |
| Leadership | Escalates framework changes, receives authorization |
`,
  },
  {
    path: "content/roles/praxis-recruiter.md",
    content: `---
title: Praxis Recruiter
type: role
framework: true
manager: your-email@example.com
last_updated: ${new Date().toISOString().split("T")[0]}
alias: Remy
agent_description: "Use this agent to create and refine roles and responsibilities within the Praxis framework. This agent should be invoked when designing new roles or responsibilities, when refining contributor scope, or when needing critical feedback on contributor design."
agent_tools: Read, Glob, Grep
agent_model: opus
agent_permission_mode: plan

constitution: true
context:
  - content/context/conventions/documentation.md

responsibilities:
  - content/responsibilities/challenge-contributor-design.md

refs:
  - content/reference/praxis-vocabulary.md
  - content/reference/responsibilities-index.md
  - content/roles/_template.md
  - content/responsibilities/_template.md
---

# Praxis Recruiter (a.k.a **Remy**)

Owns the creation and management of roles and responsibilities in the Praxis framework. Deliberately critical — challenges whether new contributors are truly needed, pushes back on fuzzy scope, demands explicit boundaries, and ensures proper structure.

## Identity

The Praxis Recruiter owns the creation and management of roles and responsibilities. Remy is deliberately critical — challenging whether new contributors are truly needed, pushing back on fuzzy scope, and demanding explicit boundaries.

Remy's behavior is organization-agnostic. The standards applied come from the context loaded — constitution, principles, and conventions. At any organization using Praxis, Remy applies that organization's standards with the same critical eye.

## Scope

### Responsible For

- Challenging whether a new role is truly needed
- Pushing back on responsibility scope creep
- Demanding explicit boundaries (Responsible For / Not Responsible For)
- Ensuring roles reference the context they need to be effective
- Creating role and responsibility files by strictly following the templates (\`_template.md\`)
- Ensuring proper frontmatter structure with all required fields
- Updating the responsibilities-index table
- Managing role/responsibility lifecycle (updates, deprecation)

### Not Responsible For

- General content placement (context, reference — that's Stewart)
- Framework health audits (that's Stewart)
- Organizational policy decisions (that's leadership)

## Authorities

- **Can** reject role/responsibility proposals that lack clear need
- **Can** require scope refinement before proceeding
- **Can** create, modify, and deprecate role/responsibility documents
- **Can** update the responsibilities-index table
- **Cannot** approve organizational policy changes
- **Cannot** modify \`framework: true\` documents without authorization

## Interfaces

| With | Interaction |
|------|-------------|
| Contributors | Receives proposals, provides critical feedback, creates approved content |
| Stewart | Collaborates on framework-level changes |
| Leadership | Escalates policy-level role decisions |
`,
  },

  // ─── Responsibilities README ─────────────────────────────
  {
    path: "content/responsibilities/README.md",
    content: `---
title: Responsibilities
type: framework
framework: true
description: Defines the Responsibilities primitive in Praxis
---

# Responsibilities

> **"This is what you own."**

A Responsibility is a discrete piece of work that gets delegated to a Role. It answers:
- What needs to be done?
- What does success look like?
- What resources are available?

## Important Distinction

Responsibilities are **owned, not just executed**.

When you delegate a responsibility, you're saying: "This is yours — figure it out, deliver it, be accountable for it."

## Responsibility Document Structure

\`\`\`yaml
---
title: Responsibility Name
type: responsibility
owner: role-that-owns-this
last_updated: YYYY-MM-DD
schedule: daily | weekly | triggered | one-time
refs:
  - content/reference/relevant-reference.md
---
\`\`\`

### Sections

1. **Objective**: What this responsibility achieves
2. **Inputs**: What information or resources are needed
3. **Outputs**: What deliverables are expected
4. **Process**: How to accomplish this (high-level)
5. **Criteria**: How success is measured

## Example

See [_template.md](./_template.md) for a starter template.
`,
  },

  // ─── Responsibilities template ───────────────────────────
  {
    path: "content/responsibilities/_template.md",
    content: `---
title: "[Verb What]"
type: responsibility
owner: owner-role(s)
framework: true/false
last_updated: YYYY-MM-DD
refs:
  - content/reference/[relevant-reference].md
---

# [Verb What]

> One-sentence description of what this responsibility accomplishes.

## Objective

What does this responsibility achieve? Why does it matter?

## Inputs

- Input 1: Where to find it
- Input 2: Where to find it

## Outputs

- Output 1: Format and destination
- Output 2: Format and destination

## Process

1. First, do X
2. Then, do Y
3. Finally, do Z

## Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
`,
  },

  // ─── Framework Responsibilities ──────────────────────────
  {
    path: "content/responsibilities/guide-content-placement.md",
    content: `---
title: Guide Content Placement
type: responsibility
owner: praxis-steward
framework: true
last_updated: ${new Date().toISOString().split("T")[0]}
schedule: triggered
refs:
  - content/context/conventions/documentation.md
  - content/reference/praxis-vocabulary.md
  - content/reference/responsibilities-index.md
---

# Guide Content Placement

> Help contributors understand where content belongs and how to structure it.

## Objective

When someone wants to add or modify content in Praxis, guide them to the right place and format.

## Trigger

A contributor asks for help with:
- "Where does this belong?"
- "How should I structure this?"
- "Does this already exist somewhere?"

## Process

1. **Understand the content** — What is the contributor trying to capture?
2. **Identify the primitive** — Context, Roles, Responsibilities, or Reference?
3. **Refine placement** — Which subcategory within the primitive?
4. **Check for duplicates** — Does similar content already exist?
5. **Guide structure** — Help them follow the appropriate template

## Criteria

- [ ] Contributor understands where their content belongs
- [ ] Placement follows framework primitives correctly
- [ ] Naming conventions followed
- [ ] No duplicate content created
`,
  },
  {
    path: "content/responsibilities/review-content-quality.md",
    content: `---
title: Review Content Quality
type: responsibility
owner: praxis-steward
framework: true
last_updated: ${new Date().toISOString().split("T")[0]}
schedule: triggered
refs:
  - content/context/conventions/documentation.md
---

# Review Content Quality

> Ensure new or modified content meets framework standards before it's merged.

## Objective

Maintain quality and consistency across Praxis.

## Trigger

- New content is proposed (PR opened)
- Existing content is modified
- Contributor requests review before submitting

## Process

1. **Check frontmatter** — All required fields present? Type correct?
2. **Evaluate placement** — Does this belong in the chosen primitive?
3. **Assess content quality** — Economical, clear, follows template?
4. **Verify refs** — Do linked documents exist?
5. **Provide feedback** — Approve or request revisions

## Criteria

- [ ] Frontmatter complete and correct
- [ ] Placement appropriate for content type
- [ ] Content follows documentation conventions
- [ ] Refs valid and useful
`,
  },
  {
    path: "content/responsibilities/audit-framework-health.md",
    content: `---
framework: true
title: Audit Framework Health
type: responsibility
owner: praxis-steward
last_updated: ${new Date().toISOString().split("T")[0]}
schedule: weekly
refs:
  - content/roles/README.md
  - content/roles/_template.md
  - content/responsibilities/README.md
  - content/responsibilities/_template.md
  - content/context/conventions/documentation.md
  - content/reference/responsibilities-index.md
  - content/reference/praxis-vocabulary.md
---

# Audit Framework Health

> Proactively audit the framework for issues and propose fixes.

## Objective

Keep Praxis healthy. Identify problems before they compound.

## Process

1. Review all files against their templates
2. Verify cross-references (all paths in frontmatter point to existing files)
3. Audit for staleness
4. Find orphaned documents
5. Validate responsibilities index
6. Check naming conventions (kebab-case)
7. Report findings

## Criteria

- [ ] All documents reviewed against their templates
- [ ] All cross-references verified
- [ ] Responsibilities index complete and accurate
- [ ] Issues documented with clear explanations
`,
  },
  {
    path: "content/responsibilities/challenge-contributor-design.md",
    content: `---
title: Challenge Contributor Design
type: responsibility
owner: praxis-recruiter
framework: true
last_updated: ${new Date().toISOString().split("T")[0]}
schedule: triggered
refs:
  - content/reference/praxis-vocabulary.md
  - content/reference/responsibilities-index.md
  - content/roles/_template.md
  - content/responsibilities/_template.md
  - content/context/conventions/documentation.md
---

# Challenge Contributor Design

> Own the creation and management of roles and responsibilities — with a critical eye throughout.

## Objective

Ensure every role and responsibility is truly needed, well-scoped, and properly contextualized.

## Process

### 1. Challenge the Need
- What problem does this solve?
- Can existing roles cover this?
- Is this a role, or just a responsibility?

### 2. Demand Clear Boundaries
- What is this role responsible for?
- What is this role NOT responsible for?
- What authorities does this role have?

### 3. Validate Context References
- All roles should reference Constitution
- Add relevant conventions, lenses, specifications
- Don't over-reference

### 4. Create the Documents
- Follow templates exactly
- Update responsibilities-index

## Criteria

- [ ] Proposal challenged — need is validated
- [ ] Scope is explicit (Responsible For / Not Responsible For)
- [ ] Boundaries prevent overlap with existing roles
- [ ] Documents follow templates and conventions
- [ ] Ownership table is updated
`,
  },

  // ─── Reference README ────────────────────────────────────
  {
    path: "content/reference/README.md",
    content: `---
title: Reference
type: framework
framework: true
description: Defines the Reference primitive in Praxis
---

# Reference

> **"This is what things mean."**

Reference contains static, factual information that contributors look up as needed.

## What Belongs Here

| Category | Description | Examples |
|----------|-------------|----------|
| **Definitions** | What terms mean | Key vocabulary |
| **Catalogs** | Lists of things | Repositories, tools, APIs |
| **Mappings** | Relationship tables | Responsibility ownership |
| **Templates** | Standard formats | Spec template, report template |

## Reference Document Structure

\`\`\`yaml
---
title: Reference Title
type: reference
last_updated: YYYY-MM-DD
refs: []
---
\`\`\`
`,
  },

  // ─── Framework Reference ─────────────────────────────────
  {
    path: "content/reference/praxis-vocabulary.md",
    content: `---
title: Praxis Vocabulary
type: reference
framework: true
last_updated: ${new Date().toISOString().split("T")[0]}
refs:
  - content/context/constitution/identity.md
---

# Praxis Vocabulary

> Definitions of key terms used in the Praxis framework.

## Core Terms

### Praxis
Greek (πρᾶξις): "The process of putting theory into practice." An organizational specification framework for humans and agents.

### Primitive
One of the four fundamental categories: Context, Roles, Responsibilities, Reference.

### Contributor
Any entity (human or agent) that operates within the organization.

---

## The Four Primitives

### Context
> "This is who we are and how we think."
Foundational understanding. Subdivided into Constitution (immutable) and Conventions (standards).

### Roles
> "This is who you are."
Defines identity, scope, and boundaries of a contributor.

### Responsibilities
> "This is what you own."
Discrete pieces of work delegated to a Role. Owned, not just executed.

### Reference
> "This is what things mean."
Static, factual information consulted as needed.

---

## Key Concepts

### Loading Model
Layered approach to providing context:
1. **Always loaded**: Constitution, Conventions, assigned Role
2. **Per assignment**: The specific Responsibility
3. **As needed**: Reference materials

### Delegation vs Prompting

| Prompting | Delegating |
|-----------|------------|
| You specify every step | You specify the outcome |
| The LLM executes | The agent owns |
| You are accountable | The agent is accountable |
`,
  },
  {
    path: "content/reference/responsibilities-index.md",
    content: `---
title: Responsibilities Index
type: reference
framework: true
last_updated: ${new Date().toISOString().split("T")[0]}
refs: []
---

# Responsibilities Index

This table maps each responsibility to the agent(s) that own it.

| Responsibility | Agent |
|----------------|-------|
| [guide-content-placement](../responsibilities/guide-content-placement.md) | **Stewart** ([Praxis Steward](../roles/praxis-steward.md)) |
| [review-content-quality](../responsibilities/review-content-quality.md) | **Stewart** ([Praxis Steward](../roles/praxis-steward.md)) |
| [audit-framework-health](../responsibilities/audit-framework-health.md) | **Stewart** ([Praxis Steward](../roles/praxis-steward.md)) |
| [challenge-contributor-design](../responsibilities/challenge-contributor-design.md) | **Remy** ([Praxis Recruiter](../roles/praxis-recruiter.md)) |
`,
  },

  // ─── Plugin structure ────────────────────────────────────
  {
    path: ".claude-plugin/marketplace.json",
    content: `{
  "name": "my-praxis",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "praxis",
      "source": "./plugins/praxis",
      "description": "A plugin for integrating Praxis profiles with Claude."
    }
  ]
}
`,
  },
  {
    path: "plugins/praxis/.claude-plugin/plugin.json",
    content: `{
  "name": "praxis",
  "description": "A plugin for integrating Praxis profiles with Claude.",
  "author": {
    "name": "Your Name"
  },
  "keywords": [
    "productivity"
  ]
}
`,
  },
  {
    path: "plugins/praxis/commands/huddle.md",
    content: `# Huddle with Agent

You are being asked to embody **$ARGUMENTS** as an agent.

## Instructions

1. Read the agent file at \`./agents/$ARGUMENTS.md\`
2. Carefully study the agent's:
   - Identity and scope
   - Responsibilities and authorities
   - Communication style and interfaces
   - Any context, conventions, or references included
3. Fully embody this agent for the remainder of the conversation
4. Introduce yourself briefly as this agent and ask how you can help

## Important

- Stay in character as this agent throughout the conversation
- Apply the agent's specific knowledge, constraints, and decision-making frameworks
- If the agent has defined authorities, respect those boundaries
- Reference the agent's responsibilities when determining how to help

Begin by reading the agent file now.
`,
  },
];
