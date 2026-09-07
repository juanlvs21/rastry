---
title: Rastry documentation
description: Learn the local-first image workflows shared by the Rastry CLI and Desktop app.
slug: docs
---

Rastry is a local-first tool for optimizing, transforming, and organizing image batches. The CLI and Desktop v0.2 workflow use the same TypeScript contracts, so a pipeline is readable, repeatable, and safe to run again.

## Start here

- [Install Rastry](/docs/install/) from a standalone CLI binary or Desktop installer.
- Follow the [quickstart](/docs/quickstart/) for a single image and a preset batch.
- Choose the [CLI reference](/docs/cli/) for scripts, CI, and agents.
- Choose the [Desktop workflow](/docs/desktop/) for selecting files and reviewing a plan visually.

## Product boundaries

Rastry supports PNG, JPEG, and WebP input and output. The current operation set is [resize](/operations/resize/), [crop](/operations/crop/), [transparent trim](/operations/trim/), [padding](/operations/padding/), [conversion with quality](/operations/convert/), and [metadata removal](/operations/strip-metadata/).

Background removal, OCR, AVIF, screenshots, cloud processing, accounts, and watch mode are not shipped capabilities. See the [roadmap](/#roadmap-title) for the intended sequence.

## The safety contract

Every run can be planned before it writes. Dry-run is the default CLI behavior, and Desktop shows a plan preview before execution. Outputs use a derived name or an explicit output directory; originals and existing files are not silently replaced. Read the full [safety model](/docs/safety/).
