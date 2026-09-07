---
title: Desktop workflow
description: Select image paths, configure a pipeline, preview the plan, and execute it through typed RPC.
slug: docs/desktop
---

Desktop v0.2 is a guided three-step workflow over the same core rules as the CLI.

## 1. Import

Select individual image files, select a folder, or drop paths when the platform exposes them. The app keeps the selected paths in the React view and asks the Bun main process to inspect and discover inputs.

## 2. Configure

Choose an output directory and edit an ordered list of operations: resize, crop, transparent trim, padding, conversion, quality, and metadata removal. The editor validates the pipeline before it is handed to the service.

## 3. Process

Select Preview plan before execution. The preview shows the deterministic run id, files, output paths, warnings, and conflicts. Only Execute confirmed plan writes results. Progress and the final summary report processed, skipped, failed, and cancelled files.

## Privacy boundary

The webview does not read the filesystem or image bytes. Filesystem access and image processing stay in the Bun main process and cross the boundary through typed RPC. This public website is separate from the desktop runtime; it does not import Electrobun modules or @rastry/image-engine.

Read [safety](/docs/safety/) and the [shared pipeline contract](/docs/pipelines/) before building a workflow you want to repeat in the CLI.
