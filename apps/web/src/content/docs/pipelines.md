---
title: Pipelines
description: Define ordered, versioned image transformations in the shared Rastry pipeline contract.
slug: docs/pipelines
---

A pipeline is JSON with schema version 1 and at least one operation. The same shape is used by the CLI preset loader and the Desktop operation editor.

## A complete pipeline

```json
{
  "version": 1,
  "name": "web-asset",
  "operations": [
    { "type": "trim", "alphaThreshold": 0 },
    { "type": "resize", "width": 1600, "fit": "contain" },
    { "type": "convert", "format": "webp", "quality": 82 },
    { "type": "strip-metadata" }
  ]
}
```

The operation order is intentional: remove transparent borders, limit the dimensions, encode as WebP, and remove metadata from the final output.

## Validation

Before processing, the shared core rejects:

- unknown schema versions or unknown fields;
- an empty operation list;
- invalid dimensions, anchors, fits, colors, or quality values;
- unsupported output formats; and
- incompatible combinations such as an anchored crop without width and height.

The canonical schema is [packages/contracts/schema/pipeline.schema.json](https://github.com/juanldev/rastry/blob/main/packages/contracts/schema/pipeline.schema.json). Read [configuration](/docs/configuration/) for field-level guidance.
