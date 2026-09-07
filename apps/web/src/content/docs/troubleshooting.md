---
title: Troubleshooting
description: Diagnose common Rastry planning, preset, format, and Desktop workflow failures.
slug: docs/troubleshooting
---

## The CLI says --to is required

The shorthand command needs an output format:

```bash
rastry photo.png --to webp --dry-run
```

If you are using a preset, include the run command and --preset:

```bash
rastry run ./public --preset web --dry-run
```

## A preset is not found

Use one of the shipped names (web, ecommerce, or social) or pass an explicit JSON path. A bare unknown name is rejected so a typo cannot silently select a different workflow.

## The plan reports OUTPUT_EXISTS

Choose a different --output directory or resolve the existing output. Rastry does not silently replace an existing file. If an output would equal its input, planning fails with OUTPUT_EQUALS_INPUT.

## The pipeline is rejected

Check that version is 1, operations is non-empty, and every operation uses only the fields supported by its type. Quality is an integer from 1 to 100; padding colors use #RRGGBB; and cover resize requires both dimensions plus an anchor. The [pipeline schema](/docs/pipelines/) lists the full contract.

## Desktop selection or preview fails

If a dialog is unavailable, use the other input method or verify that the app has filesystem access. If a preview run is missing or already executing, return to the workflow and create a fresh preview. The app intentionally keeps preview and execution separate.

## Need more detail

Run with --json to preserve structured plan and summary data, then include the error code, command shape, operating system, and a minimal reproducible input in an issue. Do not attach private images unless you have removed sensitive content.
