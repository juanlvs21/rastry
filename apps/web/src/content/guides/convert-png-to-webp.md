---
title: Convert PNG to WebP
description: Convert a PNG asset to WebP locally while keeping the source intact and making quality explicit.
slug: convert-png-to-webp
audience: Developers
example: rastry logo.png --to webp --quality 82 --dry-run
docsPath: /operations/convert/
related:
  - /formats/png/
  - /formats/webp/
  - /docs/quickstart/
---

WebP is often a useful delivery format for a PNG asset, but the right choice depends on whether the image needs lossless pixels or transparency. Inspect the result rather than assuming that a smaller file is always better.

## Convert one file

```bash
rastry logo.png --to webp --quality 82 --dry-run
```

The shorthand creates a conversion followed by metadata removal. Review the derived output path, then execute:

```bash
rastry logo.png --to webp --quality 82 --execute
```

The PNG remains untouched and the generated file uses a -rastry.webp suffix when no output directory is provided.

## Convert a folder

Use the [web preset](/presets/web/) when the folder also needs a dimension limit:

```bash
rastry run ./public --preset web --output ./optimized --dry-run
```

For logos and illustrations, confirm that transparency and fine edges still look correct. Read [PNG](/formats/png/), [WebP](/formats/webp/), and the [safety model](/docs/safety/) before automating the workflow.
