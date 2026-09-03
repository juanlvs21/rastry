import { dirname } from "node:path";
import { mkdir, open, rm, stat } from "node:fs/promises";

import type { ConvertOperation, PaddingOperation, ResizeOperation } from "@rastry/contracts";

import {
  isSupportedInputFormat,
  type ExecutionError,
  type ExecutionControl,
  type ExecutionFileResult,
  type ExecutionPlan,
  type ExecutionSummary,
  type PipelineOperation,
  type PlannedFile,
} from "@rastry/contracts";

import {
  cropRaster,
  cropRasterByAnchor,
  decodePng,
  encodePng,
  hasTransparency,
  padRaster,
  RasterError,
  trimRaster,
  type Raster,
  type Rgba,
} from "./raster";

const DEFAULT_MAX_PIXELS = 268_402_689;

export type ImageEngineErrorCode =
  | "INVALID_ENGINE_OPTIONS"
  | "INPUT_NOT_FOUND"
  | "INPUT_NOT_READABLE"
  | "INPUT_READ_FAILED"
  | "UNSUPPORTED_INPUT_FORMAT"
  | "IMAGE_TOO_LARGE"
  | "INVALID_GEOMETRY"
  | "ALPHA_NOT_SUPPORTED"
  | "EMPTY_ALPHA_BOUNDS"
  | "DECODE_FAILED"
  | "ENCODE_FAILED"
  | "OUTPUT_EXISTS"
  | "OUTPUT_WRITE_FAILED"
  | "UNSUPPORTED_OPERATION";

export class ImageEngineError extends Error {
  readonly code: ImageEngineErrorCode;

  constructor(code: ImageEngineErrorCode, message: string) {
    super(message);
    this.name = "ImageEngineError";
    this.code = code;
  }
}

export type ImageEngineOptions = {
  maxPixels?: number;
};

export type ImageEngine = {
  execute(plan: ExecutionPlan, control?: ExecutionControl): Promise<ExecutionSummary>;
};

type Dimensions = {
  width: number;
  height: number;
};

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : String(error);
}

function mapInputError(error: unknown): ImageEngineError {
  if (error instanceof ImageEngineError) {
    return error;
  }

  const code = readErrorCode(error);
  if (code === "ENOENT") {
    return new ImageEngineError("INPUT_NOT_FOUND", "The input file could not be found.");
  }
  if (code === "EACCES" || code === "EPERM") {
    return new ImageEngineError("INPUT_NOT_READABLE", "The input file could not be read.");
  }
  if (code === "ERR_IMAGE_UNKNOWN_FORMAT") {
    return new ImageEngineError(
      "UNSUPPORTED_INPUT_FORMAT",
      "The input image format is not supported.",
    );
  }
  if (code === "ERR_IMAGE_TOO_MANY_PIXELS") {
    return new ImageEngineError(
      "IMAGE_TOO_LARGE",
      "The input image exceeds the configured pixel limit.",
    );
  }
  if (code === "ERR_IMAGE_DECODE_FAILED") {
    return new ImageEngineError("DECODE_FAILED", "The input image could not be decoded.");
  }

  return new ImageEngineError(
    "INPUT_READ_FAILED",
    `The input image could not be read: ${readErrorMessage(error)}`,
  );
}

function mapEncodeError(error: unknown): ImageEngineError {
  if (error instanceof ImageEngineError) {
    return error;
  }

  const code = readErrorCode(error);
  if (code === "ERR_IMAGE_TOO_MANY_PIXELS") {
    return new ImageEngineError(
      "IMAGE_TOO_LARGE",
      "The transformed image exceeds the configured pixel limit.",
    );
  }
  if (code === "ERR_IMAGE_FORMAT_UNSUPPORTED") {
    return new ImageEngineError(
      "ENCODE_FAILED",
      "The requested output format is not supported on this machine.",
    );
  }

  return new ImageEngineError(
    "ENCODE_FAILED",
    `The image could not be encoded: ${readErrorMessage(error)}`,
  );
}

function mapOutputError(error: unknown, output: string): ImageEngineError {
  if (error instanceof ImageEngineError) {
    return error;
  }

  const code = readErrorCode(error);
  if (code === "EEXIST") {
    return new ImageEngineError(
      "OUTPUT_EXISTS",
      `Refusing to overwrite existing output: ${output}`,
    );
  }
  return new ImageEngineError(
    "OUTPUT_WRITE_FAILED",
    `The output could not be written to ${output}: ${readErrorMessage(error)}`,
  );
}

function mapRasterError(error: RasterError): ImageEngineError {
  if (error.code === "IMAGE_TOO_LARGE") {
    return new ImageEngineError("IMAGE_TOO_LARGE", error.message);
  }
  if (error.code === "INVALID_GEOMETRY") {
    return new ImageEngineError("INVALID_GEOMETRY", error.message);
  }
  if (error.code === "EMPTY_ALPHA_BOUNDS") {
    return new ImageEngineError("EMPTY_ALPHA_BOUNDS", error.message);
  }
  return new ImageEngineError("DECODE_FAILED", error.message);
}

function pixelLimitExceeded(width: number, height: number, maxPixels: number): boolean {
  return (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > Math.floor(maxPixels / height)
  );
}

function assertPixelLimit(width: number, height: number, maxPixels: number): void {
  if (pixelLimitExceeded(width, height, maxPixels)) {
    throw new ImageEngineError(
      "IMAGE_TOO_LARGE",
      "The transformed image exceeds the configured pixel limit.",
    );
  }
}

function roundedProportionalDimension(value: number, scale: number): number {
  return Math.max(1, Math.round(value * scale));
}

function getContainDimensions(current: Dimensions, width: number, height: number): Dimensions {
  const scale = Math.min(width / current.width, height / current.height, 1);
  return {
    width: roundedProportionalDimension(current.width, scale),
    height: roundedProportionalDimension(current.height, scale),
  };
}

function getCoverDimensions(current: Dimensions, width: number, height: number): Dimensions {
  const widthScale = width / current.width;
  const heightScale = height / current.height;
  if (widthScale >= heightScale) {
    return { width, height: Math.max(height, Math.ceil(current.height * widthScale)) };
  }
  return { width: Math.max(width, Math.ceil(current.width * heightScale)), height };
}

async function rasterize(image: Bun.Image, maxPixels: number): Promise<Raster> {
  try {
    const bytes = await image.png().bytes();
    return decodePng(bytes, maxPixels);
  } catch (error) {
    if (error instanceof RasterError) throw error;
    throw mapEncodeError(error);
  }
}

async function rasterizeInput(image: Bun.Image, maxPixels: number): Promise<Raster> {
  try {
    const bytes = await image.png().bytes();
    return decodePng(bytes, maxPixels);
  } catch (error) {
    if (error instanceof RasterError) throw error;
    throw mapInputError(error);
  }
}

async function resizeWithBun(
  raster: Raster,
  operation: ResizeOperation,
  maxPixels: number,
): Promise<Raster> {
  const { width, height, fit } = operation;
  if (width !== undefined && height !== undefined && fit === "cover") {
    const scaled = getCoverDimensions(raster, width, height);
    assertPixelLimit(scaled.width, scaled.height, maxPixels);
    const resized = await rasterize(
      new Bun.Image(encodePng(raster)).resize(scaled.width),
      maxPixels,
    );
    if (resized.width < width || resized.height < height) {
      throw new ImageEngineError(
        "INVALID_GEOMETRY",
        "The cover resize could not fill the requested dimensions.",
      );
    }
    assertPixelLimit(width, height, maxPixels);
    return cropRasterByAnchor(resized, width, height, operation.anchor!);
  }

  if (width !== undefined && height !== undefined) {
    const dimensions =
      fit === "contain" ? getContainDimensions(raster, width, height) : { width, height };
    assertPixelLimit(dimensions.width, dimensions.height, maxPixels);
    const resized = new Bun.Image(encodePng(raster)).resize(
      width,
      height,
      fit === "contain" ? { fit: "inside", withoutEnlargement: true } : { fit: "fill" },
    );
    return rasterize(resized, maxPixels);
  }

  if (width !== undefined) {
    const nextWidth = Math.min(width, raster.width);
    const nextHeight = roundedProportionalDimension(raster.height, nextWidth / raster.width);
    assertPixelLimit(nextWidth, nextHeight, maxPixels);
    return rasterize(new Bun.Image(encodePng(raster)).resize(nextWidth), maxPixels);
  }

  const nextHeight = Math.min(height ?? raster.height, raster.height);
  const nextWidth = roundedProportionalDimension(raster.width, nextHeight / raster.height);
  assertPixelLimit(nextWidth, nextHeight, maxPixels);
  return rasterize(new Bun.Image(encodePng(raster)).resize(nextWidth, undefined), maxPixels);
}

function paddingColor(operation: PaddingOperation): Rgba {
  if ("transparent" in operation.background) {
    return [0, 0, 0, 0];
  }
  const color = operation.background.color;
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new ImageEngineError("INVALID_GEOMETRY", "Padding background color must use #RRGGBB.");
  }
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
    operation.background.alpha ?? 255,
  ];
}

function paddedDimensions(raster: Dimensions, operation: PaddingOperation): Dimensions {
  const width = raster.width + operation.left + operation.right;
  const height = raster.height + operation.top + operation.bottom;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    throw new ImageEngineError(
      "IMAGE_TOO_LARGE",
      "The transformed image dimensions overflow safely.",
    );
  }
  return { width, height };
}

function finalConversion(operations: readonly PipelineOperation[]): ConvertOperation | undefined {
  let conversion: ConvertOperation | undefined;
  for (const operation of operations) {
    if (operation.type === "convert") conversion = operation;
  }
  return conversion;
}

async function writeExclusive(output: string, bytes: Uint8Array): Promise<number> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let completed = false;

  try {
    await mkdir(dirname(output), { recursive: true });
    handle = await open(output, "wx");
    await handle.write(bytes);
    completed = true;
    return bytes.byteLength;
  } catch (error) {
    throw mapOutputError(error, output);
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } finally {
        if (!completed) {
          await rm(output, { force: true }).catch(() => undefined);
        }
      }
    }
  }
}

async function processFile(
  file: PlannedFile,
  operations: readonly PipelineOperation[],
  maxPixels: number,
): Promise<ExecutionFileResult> {
  let bytesBefore: number;
  try {
    bytesBefore = (await stat(file.input)).size;
  } catch (error) {
    throw mapInputError(error);
  }

  let image: Bun.Image;
  try {
    image = new Bun.Image(file.input, { maxPixels });
  } catch (error) {
    throw mapInputError(error);
  }
  let metadata: Awaited<ReturnType<Bun.Image["metadata"]>>;
  try {
    metadata = await image.metadata();
  } catch (error) {
    throw mapInputError(error);
  }

  if (!isSupportedInputFormat(metadata.format)) {
    throw new ImageEngineError(
      "UNSUPPORTED_INPUT_FORMAT",
      `Input format ${metadata.format} is not supported. Expected PNG, JPEG, or WebP.`,
    );
  }

  const sourceRaster = await rasterizeInput(image, maxPixels);
  const sourceHasTransparency = hasTransparency(sourceRaster);
  if (
    sourceHasTransparency &&
    operations.some((operation) => operation.type === "convert" && operation.format === "jpeg")
  ) {
    throw new ImageEngineError(
      "ALPHA_NOT_SUPPORTED",
      "JPEG output cannot represent transparency from the input image.",
    );
  }

  let raster = sourceRaster;
  for (const operation of operations) {
    if (operation.type === "resize") {
      raster = await resizeWithBun(raster, operation, maxPixels);
      continue;
    }
    if (operation.type === "crop") {
      raster =
        "area" in operation
          ? cropRaster(raster, operation.area)
          : cropRasterByAnchor(raster, operation.width, operation.height, operation.anchor);
      continue;
    }
    if (operation.type === "trim") {
      if (metadata.format === "jpeg" || !sourceHasTransparency) {
        throw new ImageEngineError(
          "ALPHA_NOT_SUPPORTED",
          "Transparent trim requires an image with an alpha channel.",
        );
      }
      raster = trimRaster(raster, operation.alphaThreshold ?? 0);
      continue;
    }
    if (operation.type === "padding") {
      const dimensions = paddedDimensions(raster, operation);
      assertPixelLimit(dimensions.width, dimensions.height, maxPixels);
      raster = padRaster(raster, operation, paddingColor(operation));
      continue;
    }
  }

  let bytes: Uint8Array;
  try {
    const conversion = finalConversion(operations);
    const outputFormat = conversion?.format ?? metadata.format;
    if (outputFormat === "jpeg" && hasTransparency(raster)) {
      throw new ImageEngineError(
        "ALPHA_NOT_SUPPORTED",
        "JPEG output cannot represent transparency.",
      );
    }
    if (outputFormat === "png") {
      bytes = encodePng(raster);
    } else {
      const outputImage = new Bun.Image(encodePng(raster));
      if (outputFormat === "jpeg") {
        bytes = await (conversion?.quality === undefined
          ? outputImage.jpeg().bytes()
          : outputImage.jpeg({ quality: conversion.quality }).bytes());
      } else {
        bytes = await (conversion?.quality === undefined
          ? outputImage.webp().bytes()
          : outputImage.webp({ quality: conversion.quality }).bytes());
      }
    }
  } catch (error) {
    if (error instanceof ImageEngineError || error instanceof RasterError) throw error;
    throw mapEncodeError(error);
  }

  const bytesAfter = await writeExclusive(file.output, bytes);
  return {
    input: file.input,
    output: file.output,
    status: "processed",
    bytesBefore,
    bytesAfter,
  };
}

function toExecutionError(error: unknown): ExecutionError {
  const normalized =
    error instanceof ImageEngineError
      ? error
      : error instanceof RasterError
        ? mapRasterError(error)
        : mapInputError(error);
  return { code: normalized.code, message: normalized.message };
}

function summarize(files: ExecutionFileResult[], dryRun: boolean): ExecutionSummary {
  return {
    dryRun,
    total: files.length,
    files,
    processed: files.filter((file) => file.status === "processed").length,
    skipped: files.filter((file) => file.status === "skipped").length,
    failed: files.filter((file) => file.status === "failed").length,
    cancelled: files.filter((file) => file.status === "cancelled").length,
    bytesBefore: files.reduce((total, file) => total + (file.bytesBefore ?? 0), 0),
    bytesAfter: files.reduce((total, file) => total + (file.bytesAfter ?? 0), 0),
  };
}

function preflightFailure(file: PlannedFile): ExecutionFileResult | undefined {
  return file.preflightError === undefined
    ? undefined
    : {
        input: file.input,
        output: file.output,
        status: "failed",
        error: file.preflightError,
      };
}

async function executePlan(
  plan: ExecutionPlan,
  maxPixels: number,
  control?: ExecutionControl,
): Promise<ExecutionSummary> {
  if (plan.dryRun) {
    const summary = summarize(
      plan.files.map(
        (file) =>
          preflightFailure(file) ?? { input: file.input, output: file.output, status: "skipped" },
      ),
      true,
    );
    control?.onProgress?.({ phase: "completed", completed: summary.total, total: summary.total });
    return summary;
  }

  // The Bun backend uses the same static codecs and geometry implementation on
  // each platform, keeping output behavior independent of the host image stack.
  Bun.Image.backend = "bun";

  const files: ExecutionFileResult[] = [];
  const total = plan.files.length;
  control?.onProgress?.({ phase: "started", completed: 0, total });

  for (const [index, file] of plan.files.entries()) {
    if (control?.isCancelled?.()) {
      files.push(
        ...plan.files.slice(index).map((remaining) => ({
          input: remaining.input,
          output: remaining.output,
          status: "cancelled" as const,
        })),
      );
      control.onProgress?.({ phase: "cancelled", completed: files.length, total });
      break;
    }

    control?.onProgress?.({ phase: "file-started", completed: files.length, total, file });
    const knownFailure = preflightFailure(file);
    if (knownFailure !== undefined) {
      files.push(knownFailure);
    } else {
      try {
        files.push(await processFile(file, plan.pipeline.operations, maxPixels));
      } catch (error) {
        files.push({
          input: file.input,
          output: file.output,
          status: "failed",
          error: toExecutionError(error),
        });
      }
    }
    const result = files[files.length - 1]!;
    control?.onProgress?.({
      phase: "file-finished",
      completed: files.length,
      total,
      file,
      result,
    });
  }

  const summary = summarize(files, false);
  control?.onProgress?.({ phase: "completed", completed: summary.total, total: summary.total });
  return summary;
}

export function createImageEngine(options: ImageEngineOptions = {}): ImageEngine {
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
  if (!Number.isInteger(maxPixels) || maxPixels <= 0) {
    throw new ImageEngineError("INVALID_ENGINE_OPTIONS", "maxPixels must be a positive integer.");
  }

  return {
    execute(plan, control) {
      return executePlan(plan, maxPixels, control);
    },
  };
}
