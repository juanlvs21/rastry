---
title: Configuration
description: Configure input paths, output destinations, dry-run behavior, and pipeline operations.
slug: docs/configuration
---

Rastry configuration has two layers: command options describe the run, while a pipeline describes the image transformations.

## Run configuration

| Field or flag              | Behavior                                                     |
| -------------------------- | ------------------------------------------------------------ |
| inputs                     | One or more file or folder paths. At least one is required.  |
| outputDirectory / --output | Explicit destination for planned outputs.                    |
| pipeline                   | Versioned object with an ordered operations array.           |
| dryRun / --dry-run         | Plan without writing. CLI defaults to this mode.             |
| --execute                  | Opt into execution after reviewing the plan.                 |
| overwrite                  | Not enabled by default; output/input conflicts are rejected. |

## Operation fields

resize accepts a positive width and/or height, plus contain, cover, or fill. cover also requires an anchor. crop accepts either an area {x, y, width, height} or target dimensions with a supported anchor.

trim accepts an optional alpha threshold from 0 to 255. padding requires at least one non-zero side and a transparent background or #RRGGBB color with optional alpha. convert accepts png, jpeg, or webp and an optional integer quality from 1 to 100. strip-metadata has no extra fields.

The <a href="https://github.com/juanlvs21/rastry/blob/main/packages/contracts/schema/pipeline.schema.json" target="_blank" rel="noopener noreferrer">pipeline schema</a> is the source of truth for serialized configuration. See [operations](/docs/operations/) for examples.
