---
title: Safety and privacy
description: Understand dry-run planning, output naming, conflict handling, batch isolation, and the local-first privacy boundary.
slug: docs/safety
---

## Plan before write

The CLI defaults to dry-run. It reports affected files, operation order, estimated output paths, warnings, and preflight conflicts. Use --execute only after reviewing that plan. Desktop follows the same sequence with a visible preview screen.

## Originals are protected

When no output directory is supplied, Rastry derives a sibling output such as photo-rastry.webp. With --output, it writes into the chosen destination. If an output already exists or would resolve to the input, planning fails instead of silently replacing data.

## Failures stay local to a file

Batch execution summarizes each file independently. A malformed or unsupported input can fail while other valid files continue to produce results. The final summary reports processed, skipped, failed, cancelled, and byte totals.

## Processing is local

The image engine uses Bun.Image locally. The Desktop webview communicates with the main process through typed RPC and does not receive image bytes. The website is static documentation and has no upload form, account, cloud image service, analytics, or telemetry enabled by default. Read the public [privacy statement](/privacy/).

## What is not promised

Rastry does not currently offer an explicit overwrite workflow, background removal, OCR, AVIF, screenshot capture, cloud sync, accounts, or watch mode. Those constraints are part of the current product boundary, not hidden switches.
