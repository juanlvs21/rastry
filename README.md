# Rastry

Rastry is a local-first, open-source image optimization and transformation tool. This repository contains the shared TypeScript core, a Bun CLI, and an Electrobun + React desktop application.

The project is at the foundation stage. The CLI can already parse a safe transformation request and produce an execution plan without touching source files. Actual image encoding remains behind the `@rastry/image-engine` adapter while the Bun image API spike is completed.

## Why Rastry exists

Rastry started as a personal need. While working on products, landing pages, websites, and posts for my own site, I kept repeating the same workflow: open one app to crop an image, another to compress the result, and a third one to convert it to a different format. Rastry is an attempt to bring that everyday workflow into one local-first tool.

The rise of AI-assisted software development also shaped the project. The CLI makes image optimization available to coding agents such as Codex and Claude Code, so they can transform images as part of an automated workflow instead of requiring every step to be done manually in a separate app.

## Requirements

- [Bun](https://bun.sh/) 1.4.0 or newer.
- Windows 11, macOS 14+, or Ubuntu 24.04+ for the current Electrobun toolchain.
- WebView2 on Windows (normally installed with the operating system).

## Start here

```bash
bun install
bun run dev:cli -- --help
bun run dev:cli -- photo.png --to webp --quality 82 --dry-run
```

Launch the desktop application with:

```bash
bun run dev:desktop
```

The first desktop run downloads the Electrobun/Hutch toolchain associated with the locked `electrobun` package.

## Repository layout

```text
apps/
  cli/             Bun command-line application
  desktop/         Electrobun main process and React webview
  web/             Reserved for Astro + Starlight
packages/
  contracts/       Shared, versioned configuration types
  core/            Planning, validation, and output-path safety
  image-engine/    Bun image processing adapter boundary
docs/changes/       ADRs, features, and implementation change records
examples/presets/   Versioned example configurations
```

Read [rastry.md](./rastry.md) for the product definition and [CONTRIBUTING.md](./CONTRIBUTING.md) before proposing changes.

## Common commands

| Command                     | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `bun run dev:cli -- --help` | Run the CLI from source.                         |
| `bun run dev:desktop`       | Build the React view and launch Electrobun.      |
| `bun run dev:desktop:hmr`   | Launch Vite HMR and the desktop shell together.  |
| `bun run build:cli`         | Compile the CLI to `apps/cli/dist/rastry`.       |
| `bun run build:desktop`     | Build an Electrobun stable artifact.             |
| `bun run format`            | Format supported source and configuration files. |
| `bun run format:check`      | Verify that files use the repository format.     |
| `bun run lint`              | Lint JavaScript and TypeScript with Oxlint.      |
| `bun run lint:fix`          | Apply Oxlint's safe automatic fixes.             |
| `bun run check`             | Format-check, lint, type-check, and run tests.   |

## License

Licensed under the [Apache License 2.0](./LICENSE).
