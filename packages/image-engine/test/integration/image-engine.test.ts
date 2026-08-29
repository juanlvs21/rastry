import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

import type { PipelineConfig } from "@rastry/contracts";
import { createExecutionPlan } from "@rastry/core";
import { createImageEngine } from "@rastry/image-engine";

const fixture = resolve(import.meta.dir, "../../../..", "assets/test/landscape-mountains.jpg");

const convertPipeline = (format: "png" | "jpeg" | "webp"): PipelineConfig => ({
  version: 1,
  operations: [
    { type: "resize", width: 400, height: 400, fit: "contain" },
    { type: "convert", format, quality: 80 },
    { type: "strip-metadata" },
  ],
});

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("Bun.Image execution adapter", () => {
  test("converts, resizes, and writes PNG, JPEG, and WebP outputs", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-formats-"));

    try {
      const engine = createImageEngine();
      const formats = [
        { format: "png" as const, extension: "png" },
        { format: "jpeg" as const, extension: "jpg" },
        { format: "webp" as const, extension: "webp" },
      ];

      for (const { format, extension } of formats) {
        const outputDirectory = join(temporaryRoot, format);
        const plan = createExecutionPlan({
          inputs: [fixture],
          outputDirectory,
          pipeline: convertPipeline(format),
          dryRun: false,
        });

        const summary = await engine.execute(plan);
        const output = plan.files[0]!.output;
        const metadata = await new Bun.Image(output).metadata();

        expect(summary).toMatchObject({ processed: 1, skipped: 0, failed: 0 });
        expect(output).toBe(join(outputDirectory, `landscape-mountains.${extension}`));
        expect(metadata.format).toBe(format);
        expect(metadata.width).toBe(400);
        expect(metadata.height).toBe(267);
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("keeps dry-run execution free of filesystem mutations", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-dry-run-"));
    const outputDirectory = join(temporaryRoot, "output");

    try {
      const plan = createExecutionPlan({
        inputs: [join(temporaryRoot, "missing.jpg")],
        outputDirectory,
        pipeline: convertPipeline("webp"),
      });
      const summary = await createImageEngine().execute(plan);

      expect(summary).toMatchObject({ dryRun: true, processed: 0, skipped: 1, failed: 0 });
      expect(await pathExists(outputDirectory)).toBe(false);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("does not overwrite an existing output", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-collision-"));
    const outputDirectory = join(temporaryRoot, "output");
    const output = join(outputDirectory, "landscape-mountains.webp");
    const sentinel = new TextEncoder().encode("keep this file");

    try {
      await mkdir(outputDirectory, { recursive: true });
      await Bun.write(output, sentinel);

      const plan = createExecutionPlan({
        inputs: [fixture],
        outputDirectory,
        pipeline: convertPipeline("webp"),
        dryRun: false,
      });
      const summary = await createImageEngine().execute(plan);

      expect(summary.failed).toBe(1);
      expect(summary.files[0]?.error?.code).toBe("OUTPUT_EXISTS");
      expect(new Uint8Array(await readFile(output))).toEqual(sentinel);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("isolates a missing input failure and processes the rest of the batch", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-batch-"));
    const outputDirectory = join(temporaryRoot, "output");

    try {
      const plan = createExecutionPlan({
        inputs: [fixture, join(temporaryRoot, "missing.jpg")],
        outputDirectory,
        pipeline: convertPipeline("webp"),
        dryRun: false,
      });
      const summary = await createImageEngine().execute(plan);

      expect(summary.processed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.files[1]?.error?.code).toBe("INPUT_NOT_FOUND");
      expect(await pathExists(plan.files[0]!.output)).toBe(true);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
