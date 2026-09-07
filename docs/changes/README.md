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

| Record                                                                                                                | Status      |
| --------------------------------------------------------------------------------------------------------------------- | ----------- |
| [Change 0001: Shared TypeScript core with a local image adapter](./0001-shared-core-and-local-image-adapter.md)       | Accepted    |
| [Change 0002: Safe planning and dry-run](./0002-safe-planning-and-dry-run.md)                                         | Implemented |
| [Change 0003: Complete v0.1 image operations](./0003-complete-v0-1-image-operations.md)                               | Implemented |
| [Change 0004: Deterministic preflight and batch execution](./0004-deterministic-preflight-and-batch-execution.md)     | Implemented |
| [Change 0005: CLI presets and declarative pipeline execution](./0005-cli-presets-and-declarative-pipelines.md)        | Implemented |
| [Change 0006: Release quality and cross-platform validation](./0006-release-quality-and-cross-platform-validation.md) | Implemented |
| [Change 0007: Desktop v0.2 over typed RPC](./0007-desktop-v0-2-typed-rpc.md)                                          | Implemented |
| [Change 0008: Nunito typography](./0008-nunito-typography.md)                                                         | Implemented |
| [Change 0009: Rastry brand palette and desktop logo assets](./0009-branding-and-logo-assets.md)                       | Implemented |
| [Change 0010: Official web and public documentation](./0010-official-web-and-public-documentation.md)                 | Implemented |
| [Change 0011: Shared dark visual language](./0011-shared-dark-visual-language.md)                                     | Implemented |
| [Change 0012: Documentation contrast and CLI demo animation](./0012-documentation-contrast-and-cli-animation.md)      | Implemented |
| [Change 0013: Canonical repository links](./0013-canonical-repository-links.md)                                       | Implemented |
