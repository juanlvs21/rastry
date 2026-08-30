# Change records

This directory is the single home for Markdown documents that define or record
changes to Rastry. Architectural decisions and user-facing features use the
same document format because both describe work that changes the product.

Use the next sequential number in the filename and title:

```text
NNNN-short-description.md
```

Every record should use the same sections:

- Context
- Change
- Scope
- Acceptance criteria
- Consequences
- Alternatives considered
- Implementation plan
- Verification
- Follow-up

Keep the status current and link related records when a change depends on
another one. General reference documentation, guides, and release notes should
live in their own dedicated areas when those sections are introduced.

## Current records

| Record                                                                                                          | Status      |
| --------------------------------------------------------------------------------------------------------------- | ----------- |
| [Change 0001: Shared TypeScript core with a local image adapter](./0001-shared-core-and-local-image-adapter.md) | Accepted    |
| [Change 0002: Safe planning and dry-run](./0002-safe-planning-and-dry-run.md)                                   | Implemented |
| [Change 0003: Complete v0.1 image operations](./0003-complete-v0-1-image-operations.md)                         | Implemented |
