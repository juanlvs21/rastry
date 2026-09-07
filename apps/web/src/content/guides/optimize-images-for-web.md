---
title: Optimize images for the web
description: A safe local workflow for preparing a folder of PNG and JPEG assets for web delivery.
slug: optimize-images-for-web
audience: Web teams
example: rastry run ./public --preset web --output ./optimized --dry-run
docsPath: /docs/quickstart/
related:
  - /presets/web/
  - /formats/webp/
  - /docs/safety/
---

Web delivery usually rewards a smaller dimension, an appropriate encoder, and a clean output. The shipped web preset packages those decisions without making the source folder the destination.

## 1. Start with a folder

Keep source assets in a directory such as public/. Choose a separate output directory:

```bash
rastry run ./public --preset web --output ./optimized --dry-run
```

## 2. Review the plan

The preset uses:

1. contain resize to a maximum width of 1600 pixels;
2. WebP conversion at quality 82; and
3. metadata removal.

Review every planned path and conflict. Dry-run performs no filesystem mutation.

## 3. Execute the reviewed plan

```bash
rastry run ./public --preset web --output ./optimized --execute
```

The originals stay in public/, while generated outputs are collected in optimized/. If you need to keep JPEG for a downstream tool, use the [convert operation](/operations/convert/) with format: jpeg instead.
