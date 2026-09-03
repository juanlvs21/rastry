import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

import type { ImageFormat, PipelineConfig } from "@rastry/contracts";
import { createExecutionPlan } from "@rastry/core";
import { createImageEngine } from "@rastry/image-engine";

const fixture = resolve(import.meta.dir, "../../../..", "assets/test/landscape-mountains.jpg");

const formats: Array<{ format: ImageFormat; extension: string }> = [
  { format: "png", extension: "png" },
  { format: "jpeg", extension: "jpg" },
  { format: "webp", extension: "webp" },
];

Bun.Image.backend = "bun";

async function inputBytes(format: ImageFormat): Promise<Uint8Array> {
  const image = new Bun.Image(fixture);
  if (format === "png") return image.png().bytes();
  if (format === "jpeg") return image.jpeg({ quality: 90 }).bytes();
  return image.webp({ quality: 90 }).bytes();
}

describe("release-quality format compatibility", () => {
  test("converts every supported local fixture format to every supported output format", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-release-formats-"));
    const sourceMetadata = await new Bun.Image(fixture).metadata();

    try {
      for (const inputFormat of formats) {
        const inputPath = join(temporaryRoot, `input.${inputFormat.extension}`);
        await Bun.write(inputPath, await inputBytes(inputFormat.format));

        for (const outputFormat of formats) {
          const outputDirectory = join(
            temporaryRoot,
            `${inputFormat.format}-${outputFormat.format}`,
          );
          const pipeline: PipelineConfig = {
            version: 1,
            operations: [
              { type: "convert", format: outputFormat.format, quality: 90 },
              { type: "strip-metadata" },
            ],
          };
          const plan = createExecutionPlan({
            inputs: [inputPath],
            outputDirectory,
            pipeline,
            dryRun: false,
          });
          const summary = await createImageEngine().execute(plan);
          const outputMetadata = await new Bun.Image(plan.files[0]!.output).metadata();

          expect(summary).toMatchObject({ total: 1, processed: 1, skipped: 0, failed: 0 });
          expect(outputMetadata).toMatchObject({
            format: outputFormat.format,
            width: sourceMetadata.width,
            height: sourceMetadata.height,
          });
        }
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("keeps deterministic batch outputs and refuses to overwrite a fixture result", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-release-safety-"));
    const firstInput = join(temporaryRoot, "first.jpg");
    const secondInput = join(temporaryRoot, "second.jpg");
    const outputDirectory = join(temporaryRoot, "output");
    const pipeline: PipelineConfig = {
      version: 1,
      operations: [{ type: "convert", format: "webp" }, { type: "strip-metadata" }],
    };

    try {
      const fixtureBytes = await readFile(fixture);
      await Bun.write(firstInput, fixtureBytes);
      await Bun.write(secondInput, fixtureBytes);

      const firstPlan = createExecutionPlan({
        inputs: [firstInput, secondInput],
        outputDirectory,
        pipeline,
        dryRun: false,
      });
      const secondPlan = createExecutionPlan({
        inputs: [firstInput, secondInput],
        outputDirectory,
        pipeline,
        dryRun: false,
      });
      expect(firstPlan.files).toEqual(secondPlan.files);

      const protectedOutput = firstPlan.files[0]!.output;
      const sentinel = new TextEncoder().encode("release-fixture-sentinel");
      await Bun.write(protectedOutput, sentinel);

      const summary = await createImageEngine().execute(firstPlan);
      expect(summary).toMatchObject({ total: 2, processed: 1, skipped: 0, failed: 1 });
      expect(summary.files[0]?.error?.code).toBe("OUTPUT_EXISTS");
      expect(new Uint8Array(await readFile(protectedOutput))).toEqual(sentinel);
      expect(summary.files[1]?.status).toBe("processed");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
