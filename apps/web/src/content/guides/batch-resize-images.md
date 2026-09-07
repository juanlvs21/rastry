---
title: Batch resize images
description: Resize a folder with a predictable output directory, an inspectable plan, and isolated results.
slug: batch-resize-images
audience: Designers and developers
example: rastry ./assets --to webp --max-width 1600 --output ./optimized --dry-run
docsPath: /docs/batches/
related:
  - /operations/resize/
  - /docs/batches/
  - /presets/ecommerce/
---

When every asset needs the same maximum dimension, use the CLI shorthand or a preset. A folder input is discovered and planned file by file.

## Plan first

```bash
rastry ./assets --to webp --max-width 1600 --output ./optimized --dry-run
```

This creates a proportional resize with contain, converts to WebP, and strips metadata. It does not write to optimized/ while planning.

## Execute the reviewed batch

```bash
rastry ./assets --to webp --max-width 1600 --output ./optimized --execute
```

The summary reports each file and totals for processed, skipped, failed, and cancelled results. A bad input does not erase the successful results of its neighbors.

For a fixed square product canvas, use the [ecommerce preset](/presets/ecommerce/). For a centered square crop, use the [social preset](/presets/social/) and check the crop against the subject.
