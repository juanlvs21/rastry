---
title: PNG
description: Use PNG when lossless pixels and transparency are more important than the smallest file.
slug: png
format: png
role: input-and-output
example: rastry logo.webp --to png --dry-run
sourcePath: packages/contracts/src/index.ts
docsPath: /operations/convert/
related:
  - /formats/webp/
  - /operations/convert/
  - /operations/strip-metadata/
---

PNG is a lossless raster format with strong transparency support. It is a good destination for logos, icons, and graphics where pixel fidelity or an alpha channel matters.

## Convert to PNG

```bash
rastry logo.webp --to png --dry-run
```

PNG output does not use a quality value. If the image is photographic and opaque, compare the result with [JPEG](/formats/jpeg/) or [WebP](/formats/webp/) instead.

PNG is one of Rastry's supported input and output formats. The [convert operation](/operations/convert/) describes the shared format contract.
