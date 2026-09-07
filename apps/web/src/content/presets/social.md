---
title: Social preset
description: Create centered 1080 by 1080 WebP outputs with quality 86 for square social placements.
slug: social
preset: social
operations:
  - resize
  - convert
  - strip-metadata
outputFormat: webp
example: rastry run ./campaign --preset social --dry-run
sourcePath: examples/presets/social.json
docsPath: /docs/presets/
related:
  - /operations/resize/
  - /operations/crop/
  - /formats/webp/
---

The social preset uses a centered cover fit at 1080×1080. It fills the square and may crop the source; inspect the plan and choose a different pipeline when the subject is not centered.

## Run it

```bash
rastry run ./campaign --preset social --dry-run
```

The preset's exact contract is:

```json
{
  "version": 1,
  "name": "social",
  "operations": [
    { "type": "resize", "width": 1080, "height": 1080, "fit": "cover", "anchor": "center" },
    { "type": "convert", "format": "webp", "quality": 86 },
    { "type": "strip-metadata" }
  ]
}
```

The canonical file is [examples/presets/social.json](https://github.com/juanldev/rastry/blob/main/examples/presets/social.json).
