---
title: Add padding
description: Add transparent or colored space around an image with independently controlled sides.
slug: padding
operation: padding
example: '{ "type": "padding", "top": 24, "right": 24, "bottom": 24, "left": 24, "background": { "transparent": true } }'
sourcePath: packages/contracts/src/index.ts
docsPath: /docs/operations/
related:
  - /operations/crop/
  - /operations/trim/
  - /operations/convert/
---

Padding adds space around the current raster. Each side is a non-negative integer, and at least one side must be greater than zero.

## Transparent padding

```json
{
  "type": "padding",
  "top": 24,
  "right": 24,
  "bottom": 24,
  "left": 24,
  "background": { "transparent": true }
}
```

## Color padding

Use a six-digit hexadecimal color with an optional alpha value:

```json
{
  "type": "padding",
  "top": 16,
  "right": 24,
  "bottom": 16,
  "left": 24,
  "background": { "color": "#F5F1E8", "alpha": 255 }
}
```

The transparent form cannot be combined with color or alpha. If you need a solid background before writing JPEG, add padding and then [convert](/operations/convert/) to JPEG.
