---
title: Quickstart
description: Plan a safe single-image conversion and a repeatable batch with a shipped Rastry preset.
slug: docs/quickstart
---

## Convert one image

Start with a dry-run. This shows the planned output path without writing:

```bash
rastry photo.png --to webp --quality 82 --dry-run
```

When the plan looks right, opt into writing explicitly:

```bash
rastry photo.png --to webp --quality 82 --execute
```

Without --output, Rastry writes beside the input using a derived name such as photo-rastry.webp. It does not replace photo.png.

## Optimize a folder

The web preset resizes to a maximum width of 1600 pixels, converts to WebP at quality 82, and removes metadata:

```bash
rastry run ./public --preset web --dry-run
```

Then execute the reviewed plan into a separate directory:

```bash
rastry run ./public --preset web --output ./optimized --execute
```

See the [web preset](/presets/web/), [batch guide](/guides/batch-resize-images/), and [output safety rules](/docs/safety/).

## Read machine output

Add --json to a dry-run or execution for automation:

```bash
rastry run ./public --preset web --dry-run --json
```
