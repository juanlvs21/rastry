---
title: Installation
description: Install and run the Rastry CLI, Desktop app, and web documentation locally with Bun.
slug: docs/install
---

Rastry currently uses Bun 1.4.0 or newer. The repository supports Windows 11, macOS 14+, and Ubuntu 24.04+ for the current Electrobun toolchain. WebView2 is normally present on Windows.

## Install the repository

Clone the repository, then install the workspace dependencies:

```bash
bun install
```

Run the CLI from source:

```bash
bun run dev:cli -- --help
```

Start the Desktop app:

```bash
bun run dev:desktop
```

The first Desktop run prepares the locked Electrobun and Hutch toolchain. Image processing remains local to the Bun main process.

## Run the documentation site

The site is an independent static package. From the repository root:

```bash
bun --filter @rastry/web dev
bun --filter @rastry/web typecheck
bun --filter @rastry/web build
```

The production output is apps/web/dist/. It contains static HTML and assets and does not need the CLI, Desktop runtime, an API, or image-processing services.

## Deployment handoff

Vercel can use apps/web as the project root with the checked-in vercel.json: install with Bun, run bun run build, and serve dist/. DNS, credentials, and custom-domain activation for rastry.juanl.dev are intentionally separate follow-up work.
