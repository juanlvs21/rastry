# Rastry

Rastry is a local-first, open-source image optimization and transformation tool. This repository contains the shared TypeScript core, a Bun CLI, and an Electrobun + React desktop application.

The project is at the foundation stage. The CLI can parse safe transformation requests, load reusable JSON presets, and execute local PNG, JPEG, and WebP transformations through the `@rastry/image-engine` adapter. Planning remains the default, so source files are never modified unless `--execute` is explicitly provided.

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
bun run dev:cli -- assets/test/landscape-mountains.jpg --to webp --max-width 1200 --execute
bun run dev:cli -- run ./assets/test --preset web --dry-run
bun run dev:cli -- run ./assets/test --preset ./examples/presets/ecommerce.json --execute
```

The CLI includes the `web`, `ecommerce`, and `social` presets. Custom presets
are readable JSON files using the versioned schema at
`packages/contracts/schema/pipeline.schema.json`:

```bash
rastry run ./public --preset web
rastry run ./public --preset ./presets/marketing.json --output ./optimized --execute
```

Preset runs support `--output`, `--dry-run`, `--execute`, and `--json`. The
operation shorthand flags cannot be combined with `--preset`; define those
operations in the preset itself.

Launch the desktop application with:

```bash
bun run dev:desktop
```

The desktop workflow keeps filesystem access in the Bun main process. Select
image files or folders, or drop paths when the platform exposes them, choose an
output directory, and configure resize, crop, transparent trim, padding,
conversion, quality, and metadata removal. Every run starts as a dry-run plan;
review the deterministic output paths and conflicts before selecting
`Execute confirmed plan`. Originals and existing outputs are never overwritten.

The first desktop run downloads the Electrobun/Hutch toolchain associated with
the locked `electrobun` package. Image bytes stay local and do not cross the
typed RPC bridge into the React webview.

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
