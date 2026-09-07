---
title: WebP
description: Use WebP for compact web delivery with optional transparency and adjustable quality.
slug: webp
format: webp
role: input-and-output
example: rastry photo.png --to webp --quality 82 --dry-run
sourcePath: packages/contracts/src/index.ts
docsPath: /operations/convert/
related:
  - /guides/convert-png-to-webp/
  - /presets/web/
  - /formats/jpeg/
---

WebP is Rastry's default destination in the shipped presets. It supports transparency and a quality value from 1 to 100, making it useful for many web assets.

## Convert to WebP

```bash
rastry photo.png --to webp --quality 82 --dry-run
```

The shipped [web preset](/presets/web/) combines a 1600-pixel maximum width, quality 82, and metadata removal. Use the [PNG to WebP guide](/guides/convert-png-to-webp/) when you want to review the tradeoffs on a specific asset group.
