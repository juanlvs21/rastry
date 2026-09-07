---
title: Trim transparent borders
description: Remove unnecessary transparent borders from compatible images with an explicit alpha threshold.
slug: trim
operation: trim
example: '{ "type": "trim", "alphaThreshold": 0 }'
sourcePath: packages/contracts/src/index.ts
docsPath: /docs/operations/
related:
  - /operations/padding/
  - /operations/resize/
  - /operations/strip-metadata/
---

Trim removes transparent space around an image. It is intended for assets with an alpha channel, such as logos, icons, and illustrations. Opaque images have no transparent border to remove.

## Threshold

The optional alphaThreshold is an integer from 0 to 255. A value of 0 trims only fully transparent pixels:

```json
{
  "version": 1,
  "operations": [
    { "type": "trim", "alphaThreshold": 0 },
    { "type": "convert", "format": "webp", "quality": 86 }
  ]
}
```

Use trim before [resize](/operations/resize/) when the transparent border should not count toward the asset's final dimensions. Add [padding](/operations/padding/) afterward when a controlled breathing room is needed.
