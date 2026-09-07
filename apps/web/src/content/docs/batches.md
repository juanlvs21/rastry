---
title: Batches
description: Process files and folders consistently while keeping failures and output paths visible.
slug: docs/batches
---

Pass one or more files or folders as inputs. Folder discovery filters for supported image formats and produces a plan for each discovered file.

```bash
rastry ./public ./marketing/hero.png --to webp --output ./optimized --dry-run
```

## Isolated results

Batch execution keeps each file result separate. A file can be processed, skipped, failed, or cancelled; one invalid input does not hide successful results from the rest of the batch.

The summary includes:

- processed, skipped, failed, and cancelled counts;
- bytes before and after for processed files; and
- the input and planned output path for each file.

Use --json when a script needs to decide whether to fail a job:

```bash
rastry ./public --to webp --dry-run --json
```

## Output directories

Use --output ./optimized to keep results away from source files. If no directory is provided, Rastry derives a sibling filename with the -rastry suffix. Existing outputs are reported as conflicts; they are not silently replaced. See [safety](/docs/safety/) for preflight details.
