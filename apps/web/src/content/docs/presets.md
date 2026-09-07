---
title: Presets
description: Reuse readable local JSON pipelines from the CLI or Desktop workflow.
slug: docs/presets
---

A preset is a named pipeline stored locally as a readable JSON document. The CLI ships web, ecommerce, and social; a custom preset can be provided as an explicit JSON file path.

## Shipped presets

- [Web](/presets/web/): maximum width 1600, WebP quality 82, metadata removal.
- [Ecommerce](/presets/ecommerce/): contain within 2000×2000, WebP quality 85, metadata removal.
- [Social](/presets/social/): cover at 1080×1080 from the center, WebP quality 86, metadata removal.

Run one in dry-run mode:

```bash
rastry run ./assets --preset social --dry-run
```

## Custom preset

Copy a shipped JSON file, change its name or operations, and pass the file path:

```bash
rastry run ./public --preset ./presets/marketing.json --output ./optimized --execute
```

Preset runs support --output, --dry-run, --execute, and --json. Do not combine them with shorthand --to, --quality, or max-dimension flags. The loader validates the schema field, schema version, operation fields, and format before planning.
