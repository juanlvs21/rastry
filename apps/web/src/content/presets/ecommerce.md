---
title: Ecommerce preset
description: Fit product images inside a 2000 by 2000 canvas, write WebP quality 85, and remove metadata.
slug: ecommerce
preset: ecommerce
operations:
  - resize
  - convert
  - strip-metadata
outputFormat: webp
example: rastry run ./products --preset ecommerce --output ./optimized --dry-run
sourcePath: examples/presets/ecommerce.json
docsPath: /docs/presets/
related:
  - /guides/optimize-images-for-web/
  - /operations/resize/
  - /formats/webp/
---

The ecommerce preset keeps product imagery inside a predictable 2000×2000 contain box. It does not crop the subject, so the full product remains visible.

## Run it

```bash
rastry run ./products --preset ecommerce --output ./optimized --dry-run
```

Execute only after checking the output paths:

```bash
rastry run ./products --preset ecommerce --output ./optimized --execute
```

## Exact configuration

```json
{
  "version": 1,
  "name": "ecommerce",
  "operations": [
    { "type": "resize", "width": 2000, "height": 2000, "fit": "contain" },
    { "type": "convert", "format": "webp", "quality": 85 },
    { "type": "strip-metadata" }
  ]
}
```

The canonical file is [examples/presets/ecommerce.json](https://github.com/juanldev/rastry/blob/main/examples/presets/ecommerce.json).
