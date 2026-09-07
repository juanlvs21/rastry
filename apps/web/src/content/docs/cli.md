---
title: CLI reference
description: Use Rastry from a terminal with shorthand operations, local presets, dry-run planning, and JSON output.
slug: docs/cli
---

The CLI is the first-class automation surface. It parses arguments, loads a local preset, asks the shared core for a deterministic plan, and delegates pixel processing to the image-engine adapter.

## Shorthand command

```text
rastry <input...> --to <png|jpeg|webp> [options]
```

Supported shorthand options:

| Option       | Meaning                                           |
| ------------ | ------------------------------------------------- |
| --to         | Required output format: png, jpeg, or webp.       |
| --quality    | Integer from 1 to 100 for JPEG/WebP output.       |
| --max-width  | Maximum width for proportional resize.            |
| --max-height | Maximum height for proportional resize.           |
| --output     | Output directory.                                 |
| --dry-run    | Keep planning-only behavior. This is the default. |
| --execute    | Explicitly write the planned outputs.             |
| --json       | Print the plan or execution summary as JSON.      |

For example:

```bash
rastry ./assets --to webp --quality 80 --max-width 1600 --output ./optimized --dry-run
```

The shorthand command creates a proportional resize when a max dimension is provided, followed by conversion and metadata removal.

## Preset command

```text
rastry run <input...> --preset <web|ecommerce|social|path/to/file.json> [options]
```

Preset runs support --output, --dry-run, --execute, and --json. Shorthand flags cannot be combined with --preset; define those operations in the preset document instead. See [presets](/docs/presets/) for the schema and [shipped recipes](/presets/).

## Help and errors

rastry --help prints the current command examples. Invalid flags, missing values, unsupported formats, invalid presets, and conflicting options return a readable error with a stable error code and a non-zero exit status.
