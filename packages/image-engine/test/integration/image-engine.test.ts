import { access, copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

import type { PipelineConfig } from "@rastry/contracts";
import { createExecutionPlan } from "@rastry/core";
import { createImageEngine } from "@rastry/image-engine";
import { decodePng, encodePng, type Raster } from "../../src/raster";

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

function makeRaster(
  width: number,
  height: number,
  alpha: (x: number, y: number) => number = () => 255,
): Raster {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      pixels[index] = x * 30;
      pixels[index + 1] = y * 40;
      pixels[index + 2] = 100;
      pixels[index + 3] = alpha(x, y);
    }
  }
  return { width, height, pixels };
}

async function writeRaster(path: string, raster: Raster): Promise<void> {
  await Bun.write(path, encodePng(raster));
}

async function readRaster(path: string): Promise<Raster> {
  const png = await new Bun.Image(path).png().bytes();
  return decodePng(png, 1_000_000);
}

function pixelAt(raster: Raster, x: number, y: number): number[] {
  return Array.from(
    raster.pixels.subarray((y * raster.width + x) * 4, (y * raster.width + x + 1) * 4),
  );
}

function withTextMetadata(bytes: Uint8Array): Uint8Array {
  const type = new TextEncoder().encode("tEXt");
  const data = new TextEncoder().encode("Comment\0metadata-fixture");
  const crcTable = new Uint32Array(256);
  for (let index = 0; index < crcTable.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[index] = value >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of type) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  const chunk = new Uint8Array(12 + data.length);
  const writeUint32 = (offset: number, value: number): void => {
    chunk[offset] = Math.floor(value / 0x1000000) & 0xff;
    chunk[offset + 1] = Math.floor(value / 0x10000) & 0xff;
    chunk[offset + 2] = Math.floor(value / 0x100) & 0xff;
    chunk[offset + 3] = value & 0xff;
  };
  writeUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  writeUint32(8 + data.length, (crc ^ 0xffffffff) >>> 0);
  const result = new Uint8Array(bytes.length + chunk.length);
  result.set(bytes.subarray(0, bytes.length - 12), 0);
  result.set(chunk, bytes.length - 12);
  result.set(bytes.subarray(bytes.length - 12), bytes.length - 12 + chunk.length);
  return result;
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

  test("crops by area and by anchor without changing the source", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-crop-"));
    const input = join(temporaryRoot, "fixture.png");
    const source = makeRaster(5, 4);
    await writeRaster(input, source);
    const sourceBytes = new Uint8Array(await readFile(input));

    try {
      const areaPlan = createExecutionPlan({
        inputs: [input],
        outputDirectory: join(temporaryRoot, "area"),
        pipeline: {
          version: 1,
          operations: [{ type: "crop", area: { x: 1, y: 1, width: 2, height: 2 } }],
        },
        dryRun: false,
      });
      const areaSummary = await createImageEngine().execute(areaPlan);
      const area = await readRaster(areaPlan.files[0]!.output);
      expect(areaSummary.processed).toBe(1);
      expect(area.width).toBe(2);
      expect(area.height).toBe(2);
      expect(pixelAt(area, 0, 0)).toEqual(pixelAt(source, 1, 1));

      const anchorPlan = createExecutionPlan({
        inputs: [input],
        outputDirectory: join(temporaryRoot, "anchor"),
        pipeline: {
          version: 1,
          operations: [{ type: "crop", width: 3, height: 2, anchor: "bottom-right" }],
        },
        dryRun: false,
      });
      const anchorSummary = await createImageEngine().execute(anchorPlan);
      const anchor = await readRaster(anchorPlan.files[0]!.output);
      expect(anchorSummary.processed).toBe(1);
      expect(anchor.width).toBe(3);
      expect(anchor.height).toBe(2);
      expect(pixelAt(anchor, 0, 0)).toEqual(pixelAt(source, 2, 2));
      expect(new Uint8Array(await readFile(input))).toEqual(sourceBytes);

      const invalidPlan = createExecutionPlan({
        inputs: [input],
        outputDirectory: join(temporaryRoot, "invalid"),
        pipeline: {
          version: 1,
          operations: [{ type: "crop", area: { x: 4, y: 3, width: 2, height: 2 } }],
        },
        dryRun: false,
      });
      const invalidSummary = await createImageEngine().execute(invalidPlan);
      expect(invalidSummary.files[0]?.error?.code).toBe("INVALID_GEOMETRY");
      expect(await pathExists(invalidPlan.files[0]!.output)).toBe(false);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("trims transparent borders and reports alpha failures", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-trim-"));
    const input = join(temporaryRoot, "fixture.png");
    const source = makeRaster(5, 4, (x, y) => (x >= 1 && x <= 3 && y >= 1 && y <= 2 ? 255 : 0));
    await writeRaster(input, source);

    try {
      const plan = createExecutionPlan({
        inputs: [input],
        outputDirectory: join(temporaryRoot, "trimmed"),
        pipeline: { version: 1, operations: [{ type: "trim" }] },
        dryRun: false,
      });
      const summary = await createImageEngine().execute(plan);
      const trimmed = await readRaster(plan.files[0]!.output);
      expect(summary.processed).toBe(1);
      expect(trimmed.width).toBe(3);
      expect(trimmed.height).toBe(2);
      expect(pixelAt(trimmed, 0, 0)).toEqual(pixelAt(source, 1, 1));

      const opaqueJpegPlan = createExecutionPlan({
        inputs: [fixture],
        outputDirectory: join(temporaryRoot, "jpeg-trim"),
        pipeline: { version: 1, operations: [{ type: "trim" }] },
        dryRun: false,
      });
      const opaqueJpegSummary = await createImageEngine().execute(opaqueJpegPlan);
      expect(opaqueJpegSummary.files[0]?.error?.code).toBe("ALPHA_NOT_SUPPORTED");

      const emptyInput = join(temporaryRoot, "empty.png");
      await writeRaster(
        emptyInput,
        makeRaster(3, 3, () => 0),
      );
      const emptyPlan = createExecutionPlan({
        inputs: [emptyInput],
        outputDirectory: join(temporaryRoot, "empty-output"),
        pipeline: { version: 1, operations: [{ type: "trim" }] },
        dryRun: false,
      });
      const emptySummary = await createImageEngine().execute(emptyPlan);
      expect(emptySummary.files[0]?.error?.code).toBe("EMPTY_ALPHA_BOUNDS");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("pads with exact transparent and colored RGBA borders", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-padding-"));
    const input = join(temporaryRoot, "fixture.png");
    const source = makeRaster(2, 1);
    await writeRaster(input, source);

    try {
      const transparentPlan = createExecutionPlan({
        inputs: [input],
        outputDirectory: join(temporaryRoot, "transparent"),
        pipeline: {
          version: 1,
          operations: [
            {
              type: "padding",
              top: 1,
              right: 2,
              bottom: 1,
              left: 1,
              background: { transparent: true },
            },
          ],
        },
        dryRun: false,
      });
      const transparentSummary = await createImageEngine().execute(transparentPlan);
      const transparent = await readRaster(transparentPlan.files[0]!.output);
      expect(transparentSummary.processed).toBe(1);
      expect([transparent.width, transparent.height]).toEqual([5, 3]);
      expect(pixelAt(transparent, 0, 0)).toEqual([0, 0, 0, 0]);
      expect(pixelAt(transparent, 1, 1)).toEqual(pixelAt(source, 0, 0));

      const coloredPlan = createExecutionPlan({
        inputs: [input],
        outputDirectory: join(temporaryRoot, "colored"),
        pipeline: {
          version: 1,
          operations: [
            {
              type: "padding",
              top: 1,
              right: 1,
              bottom: 1,
              left: 1,
              background: { color: "#112233", alpha: 64 },
            },
          ],
        },
        dryRun: false,
      });
      const coloredSummary = await createImageEngine().execute(coloredPlan);
      const colored = await readRaster(coloredPlan.files[0]!.output);
      expect(coloredSummary.processed).toBe(1);
      expect(pixelAt(colored, 0, 0)).toEqual([17, 34, 51, 64]);
      expect(pixelAt(colored, 1, 1)).toEqual(pixelAt(source, 0, 0));
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("verifies contain, cover, and fill dimensions", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-resize-"));
    const input = join(temporaryRoot, "fixture.png");
    await writeRaster(input, makeRaster(4, 2));

    try {
      const cases = [
        {
          name: "contain",
          operation: { type: "resize", width: 3, height: 3, fit: "contain" },
          dimensions: [3, 2],
        },
        {
          name: "cover",
          operation: { type: "resize", width: 3, height: 3, fit: "cover", anchor: "center" },
          dimensions: [3, 3],
        },
        {
          name: "fill",
          operation: { type: "resize", width: 3, height: 3, fit: "fill" },
          dimensions: [3, 3],
        },
      ] as const;

      for (const item of cases) {
        const plan = createExecutionPlan({
          inputs: [input],
          outputDirectory: join(temporaryRoot, item.name),
          pipeline: { version: 1, operations: [item.operation] },
          dryRun: false,
        });
        const summary = await createImageEngine().execute(plan);
        const output = await new Bun.Image(plan.files[0]!.output).metadata();
        expect(summary.processed).toBe(1);
        expect([output.width, output.height]).toEqual(item.dimensions as unknown as number[]);
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("rejects alpha loss, transformed pixel overflow, and strips metadata", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-safety-"));
    const alphaInput = join(temporaryRoot, "alpha.png");
    const opaqueInput = join(temporaryRoot, "opaque.png");
    const alphaSource = makeRaster(2, 2, (x, y) => (x === 0 && y === 0 ? 0 : 255));
    await writeRaster(alphaInput, alphaSource);
    await writeRaster(opaqueInput, makeRaster(2, 2));

    try {
      const jpegPlan = createExecutionPlan({
        inputs: [alphaInput],
        outputDirectory: join(temporaryRoot, "jpeg"),
        pipeline: { version: 1, operations: [{ type: "convert", format: "jpeg" }] },
        dryRun: false,
      });
      const jpegSummary = await createImageEngine().execute(jpegPlan);
      expect(jpegSummary.files[0]?.error?.code).toBe("ALPHA_NOT_SUPPORTED");
      expect(await pathExists(jpegPlan.files[0]!.output)).toBe(false);

      const largePlan = createExecutionPlan({
        inputs: [opaqueInput],
        outputDirectory: join(temporaryRoot, "large"),
        pipeline: {
          version: 1,
          operations: [{ type: "resize", width: 3, height: 3, fit: "fill" }],
        },
        dryRun: false,
      });
      const largeSummary = await createImageEngine({ maxPixels: 8 }).execute(largePlan);
      expect(largeSummary.files[0]?.error?.code).toBe("IMAGE_TOO_LARGE");
      expect(await pathExists(largePlan.files[0]!.output)).toBe(false);

      const metadataInput = join(temporaryRoot, "metadata.png");
      await Bun.write(metadataInput, withTextMetadata(encodePng(makeRaster(2, 2))));
      const metadataPlan = createExecutionPlan({
        inputs: [metadataInput],
        outputDirectory: join(temporaryRoot, "metadata-output"),
        pipeline: { version: 1, operations: [{ type: "strip-metadata" }] },
        dryRun: false,
      });
      const metadataSummary = await createImageEngine().execute(metadataPlan);
      const outputBytes = new Uint8Array(await readFile(metadataPlan.files[0]!.output));
      expect(metadataSummary.processed).toBe(1);
      expect(new TextDecoder().decode(outputBytes)).not.toContain("metadata-fixture");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("reports ordered progress and cancels remaining files cooperatively", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-image-engine-progress-"));
    const outputDirectory = join(temporaryRoot, "output");
    const firstInput = join(temporaryRoot, "a.jpg");
    const secondInput = join(temporaryRoot, "b.jpg");
    const phases: string[] = [];
    let cancellationChecks = 0;

    try {
      await copyFile(fixture, firstInput);
      await copyFile(fixture, secondInput);
      const plan = createExecutionPlan({
        inputs: [firstInput, secondInput],
        outputDirectory,
        pipeline: { version: 1, operations: [{ type: "convert", format: "webp" }] },
        dryRun: false,
      });

      const summary = await createImageEngine().execute(plan, {
        isCancelled: () => cancellationChecks++ > 0,
        onProgress: (progress) => phases.push(progress.phase),
      });

      expect(summary).toMatchObject({
        total: 2,
        processed: 1,
        skipped: 0,
        failed: 0,
        cancelled: 1,
      });
      expect(phases).toEqual([
        "started",
        "file-started",
        "file-finished",
        "cancelled",
        "completed",
      ]);
      expect(await pathExists(join(outputDirectory, "a.webp"))).toBe(true);
      expect(await pathExists(join(outputDirectory, "b.webp"))).toBe(false);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
