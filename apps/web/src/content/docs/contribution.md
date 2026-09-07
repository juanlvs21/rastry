---
title: Contribution guide
description: Help improve Rastry with focused changes, reproducible examples, and tests around its safety contract.
slug: docs/contribution
---

Rastry is early-stage open source software. Contributions are most useful when they preserve the shared domain rules and make behavior easier to verify.

## Before changing code

Read the repository <a href="https://github.com/juanlvs21/rastry/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">contribution guide</a>, the <a href="https://github.com/juanlvs21/rastry/blob/main/rastry.md" target="_blank" rel="noopener noreferrer">product definition</a>, and the relevant <a href="https://github.com/juanlvs21/rastry/tree/main/docs/changes" target="_blank" rel="noopener noreferrer">change records</a>.

The dependency direction runs from apps through core/image-engine to contracts. The web package is intentionally independent: do not import Desktop code, Electrobun, Bun.Image, or user filesystem APIs into it.

## Checks

Use the repository toolchain:

```bash
bun install
bun run check
bun --filter @rastry/web typecheck
bun --filter @rastry/web build
```

Keep tests in the package's test/ tree and cover safety invariants, failure isolation, or observable behavior. Do not commit generated dist, build, .hutch, or optimized output.

## Web content changes

Public content is English for this first release. Catalog pages must have a real example, a stable slug, a source link, and useful related links. Update CHANGELOG.md or a release entry when the public release story changes. Do not add empty SEO pages or advertise unsupported features.

Open a focused pull request with the behavior, verification performed, and any platform-specific limitation.
