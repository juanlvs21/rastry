---
title: Resize images
description: Limit image dimensions or create an exact canvas while declaring how the image should fit.
slug: resize
operation: resize
example: rastry photo.png --to webp --max-width 1600 --dry-run
sourcePath: packages/contracts/src/index.ts
docsPath: /docs/operations/
related:
  - /docs/quickstart/
  - /operations/convert/
  - /presets/web/
---

Resize changes the image dimensions while keeping the fit policy explicit. A proportional request can provide only a width, only a height, or both maximum dimensions. Exact layouts provide both dimensions and choose how the source fits.

## Proportional resize

The CLI shorthand maps max dimensions to a contain resize before conversion:

```bash
rastry photo.png --to webp --max-width 1600 --max-height 1200 --dry-run
```

The source aspect ratio is preserved. Use the [web preset](/presets/web/) when 1600 pixels is the right maximum width for a web asset.

## Fit policies

- contain keeps the whole image inside the target dimensions.
- cover fills the target dimensions and requires an anchor such as center.
- fill creates the exact dimensions without preserving the aspect ratio.

```json
{ "type": "resize", "width": 1080, "height": 1080, "fit": "cover", "anchor": "center" }
```

Dimensions must be positive integers. The shared core validates the fit and anchor combination before any image is decoded.
