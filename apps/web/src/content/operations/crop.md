---
title: Crop an image
description: Crop an explicit rectangle or an anchored target area from a source image.
slug: crop
operation: crop
example: '{ "type": "crop", "width": 1080, "height": 1080, "anchor": "center" }'
sourcePath: packages/contracts/src/index.ts
docsPath: /docs/operations/
related:
  - /operations/resize/
  - /operations/trim/
  - /guides/batch-resize-images/
---

Crop supports two precise shapes. Use an explicit area when the coordinates are known, or target dimensions plus an anchor when the crop should be positioned relative to the source.

## Explicit area

```json
{
  "type": "crop",
  "area": { "x": 120, "y": 40, "width": 1200, "height": 800 }
}
```

Coordinates and dimensions are integer pixel values. The area form cannot be combined with width, height, or anchor.

## Anchored crop

```json
{
  "type": "crop",
  "width": 1080,
  "height": 1080,
  "anchor": "center"
}
```

Supported anchors include the corners, edges, and center. An anchored crop requires both target dimensions and a supported anchor.

Crop is useful before [conversion](/operations/convert/) when the destination has a fixed ratio. For a cover-style square workflow, compare it with [cover resize](/operations/resize/).
