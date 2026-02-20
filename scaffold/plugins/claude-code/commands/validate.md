---
description: Validate a Praxis document against its directory's README specification
---

Validate a Praxis document against the specification defined in its directory's README.

## Instructions

1. Read the document at the path: $ARGUMENTS
2. Find and read the README.md file in the same directory as the document
3. The README is the source of truth for what documents in that directory should contain

## Validation Criteria

Check the document for compliance with the README specification:

1. All required frontmatter fields mentioned in the README
2. All required sections mentioned in the README
3. Naming conventions described in the README
4. Content expectations described in the README
5. Proper markdown formatting

## Response Format

Start your response with exactly one of these words:

- **Yes** — Document fully complies with all requirements in the README
- **Maybe** — Minor issues exist (formatting, style) but structure is correct
- **No** — Major issues exist (missing sections, wrong type, broken structure)

Then explain your reasoning. When identifying issues:

- Quote the problematic section if applicable
- Reference the specific rule from the README being violated
- Suggest how to fix it
