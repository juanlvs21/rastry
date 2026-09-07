---
title: Web preset
description: Prepare common web assets with a 1600-pixel width limit, WebP quality 82, and metadata removal.
slug: web
preset: web
operations:
  - resize
  - convert
  - strip-metadata
outputFormat: webp
example: rastry run ./public --preset web --dry-run
sourcePath: examples/presets/web.json
docsPath: /docs/presets/
related:
  - /guides/optimize-images-for-web/
  - /formats/webp/
  - /operations/resize/
---

The web preset is the shortest path from a mixed asset folder to consistent WebP outputs.

## Run it

```bash
rastry run ./public --preset web --dry-run
```

Review the planned names and conflicts, then choose a destination and execute:

```bash
rastry run ./public --preset web --output ./optimized --execute
```

## Exact configuration

```json
{
  "version": 1,
  "name": "web",
  "operations": [
    { "type": "resize", "width": 1600, "fit": "contain" },
    { "type": "convert", "format": "webp", "quality": 82 },
    { "type": "strip-metadata" }
  ]
}
```

The canonical file is [examples/presets/web.json](https://github.com/juanldev/rastry/blob/main/examples/presets/web.json).
