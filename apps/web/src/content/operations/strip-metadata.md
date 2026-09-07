---
title: Strip metadata
description: Remove EXIF and unnecessary metadata from the output at the end of a pipeline.
slug: strip-metadata
operation: strip-metadata
example: '{ "type": "strip-metadata" }'
sourcePath: packages/contracts/src/index.ts
docsPath: /docs/operations/
related:
  - /operations/convert/
  - /docs/safety/
  - /docs/pipelines/
---

Strip metadata removes EXIF and unnecessary metadata from the generated output. It does not modify the source file.

## Use it at the end

```json
{
  "version": 1,
  "operations": [
    { "type": "resize", "width": 1600, "fit": "contain" },
    { "type": "convert", "format": "webp", "quality": 82 },
    { "type": "strip-metadata" }
  ]
}
```

Putting metadata removal after conversion makes the intent clear: the final file is the one cleaned before it is written. See [safety and privacy](/docs/safety/) for the broader local-first boundary.
