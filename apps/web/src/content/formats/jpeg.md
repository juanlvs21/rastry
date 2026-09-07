---
title: JPEG
description: Use JPEG for opaque photographic images where adjustable lossy compression is useful.
slug: jpeg
format: jpeg
role: input-and-output
example: rastry photo.png --to jpeg --quality 84 --dry-run
sourcePath: packages/contracts/src/index.ts
docsPath: /operations/convert/
related:
  - /formats/png/
  - /formats/webp/
  - /operations/convert/
---

JPEG is a practical format for opaque photographs. Its quality value trades file size against visible compression; the Rastry pipeline accepts integer quality from 1 to 100.

## Convert to JPEG

```bash
rastry photo.png --to jpeg --quality 84 --dry-run
```

JPEG does not preserve transparency. If the source uses an alpha channel, add a solid [padding](/operations/padding/) background or choose [PNG](/formats/png/) or [WebP](/formats/webp/) when transparency is part of the design.
