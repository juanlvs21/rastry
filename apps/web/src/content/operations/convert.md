---
title: Convert and choose quality
description: Write PNG, JPEG, or WebP output and control lossy JPEG or WebP quality.
slug: convert
operation: convert
example: rastry photo.png --to webp --quality 82 --dry-run
sourcePath: packages/contracts/src/index.ts
docsPath: /docs/operations/
related:
  - /formats/png/
  - /formats/jpeg/
  - /formats/webp/
  - /docs/quickstart/
---

Convert chooses the output encoder. Rastry currently accepts and writes PNG, JPEG, and WebP.

## CLI example

```bash
rastry photo.png --to webp --quality 82 --dry-run
```

The shorthand adds a conversion operation and then strips metadata. A quality value is an integer from 1 to 100 and is relevant to JPEG and WebP output. PNG is lossless and does not use a quality setting.

## Pipeline example

```json
{
  "type": "convert",
  "format": "webp",
  "quality": 82
}
```

Choose [PNG](/formats/png/) when lossless transparency matters, [JPEG](/formats/jpeg/) for opaque photographic output, and [WebP](/formats/webp/) when broad modern web delivery is the goal.
