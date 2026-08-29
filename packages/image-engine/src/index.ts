import { dirname } from "node:path";
import { mkdir, open, rm, stat } from "node:fs/promises";

import {
  isSupportedInputFormat,
  type ExecutionError,
  type ExecutionFileResult,
  type ExecutionPlan,
  type ExecutionSummary,
  type PipelineOperation,
  type PlannedFile,
  type ResizeOperation,
} from "@rastry/contracts";

const DEFAULT_MAX_PIXELS = 268_402_689;

export type ImageEngineErrorCode =
  | "INVALID_ENGINE_OPTIONS"
  | "INPUT_NOT_FOUND"
  | "INPUT_NOT_READABLE"
  | "INPUT_READ_FAILED"
  | "UNSUPPORTED_INPUT_FORMAT"
  | "IMAGE_TOO_LARGE"
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
  execute(plan: ExecutionPlan): Promise<ExecutionSummary>;
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

function applyResize(
  image: Bun.Image,
  operation: ResizeOperation,
  current: Dimensions,
): { image: Bun.Image; dimensions: Dimensions } {
  const { width, height, fit } = operation;

  if (width !== undefined && height !== undefined) {
    if (fit === "cover") {
      throw new ImageEngineError(
        "UNSUPPORTED_OPERATION",
        "resize.fit=cover is not supported by the Bun.Image adapter yet.",
      );
    }

    if (fit === "contain") {
      const scale = Math.min(width / current.width, height / current.height, 1);
      return {
        image: image.resize(width, height, { fit: "inside", withoutEnlargement: true }),
        dimensions: {
          width: Math.max(1, Math.round(current.width * scale)),
          height: Math.max(1, Math.round(current.height * scale)),
        },
      };
    }

    return {
      image: image.resize(width, height, { fit: "fill" }),
      dimensions: { width, height },
    };
  }

  if (width !== undefined) {
    const nextWidth = Math.min(width, current.width);
    const nextHeight = Math.max(1, Math.round((current.height * nextWidth) / current.width));
    return {
      image: image.resize(nextWidth, nextHeight, { fit: "inside", withoutEnlargement: true }),
      dimensions: { width: nextWidth, height: nextHeight },
    };
  }

  const nextHeight = Math.min(height ?? current.height, current.height);
  const nextWidth = Math.max(1, Math.round((current.width * nextHeight) / current.height));
  return {
    image: image.resize(nextWidth, nextHeight, { fit: "inside", withoutEnlargement: true }),
    dimensions: { width: nextWidth, height: nextHeight },
  };
}

function applyConversion(
  image: Bun.Image,
  operation: Extract<PipelineOperation, { type: "convert" }>,
): Bun.Image {
  if (operation.format === "png") {
    return image.png();
  }
  if (operation.format === "jpeg") {
    return operation.quality === undefined
      ? image.jpeg()
      : image.jpeg({ quality: operation.quality });
  }
  return operation.quality === undefined
    ? image.webp()
    : image.webp({ quality: operation.quality });
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

  const image = new Bun.Image(file.input, { maxPixels });
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

  let transformed = image;
  let dimensions: Dimensions = { width: metadata.width, height: metadata.height };
  for (const operation of operations) {
    if (operation.type === "resize") {
      const resized = applyResize(transformed, operation, dimensions);
      transformed = resized.image;
      dimensions = resized.dimensions;
      continue;
    }
    if (operation.type === "convert") {
      transformed = applyConversion(transformed, operation);
      continue;
    }
    // Bun.Image re-encodes the result at the terminal and does not expose a
    // metadata-preserving write path; this operation therefore needs no chain call.
  }

  let bytes: Uint8Array;
  try {
    bytes = await transformed.bytes();
  } catch (error) {
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
  const normalized = error instanceof ImageEngineError ? error : mapInputError(error);
  return { code: normalized.code, message: normalized.message };
}

function summarize(files: ExecutionFileResult[], dryRun: boolean): ExecutionSummary {
  return {
    dryRun,
    files,
    processed: files.filter((file) => file.status === "processed").length,
    skipped: files.filter((file) => file.status === "skipped").length,
    failed: files.filter((file) => file.status === "failed").length,
    bytesBefore: files.reduce((total, file) => total + (file.bytesBefore ?? 0), 0),
    bytesAfter: files.reduce((total, file) => total + (file.bytesAfter ?? 0), 0),
  };
}

async function executePlan(plan: ExecutionPlan, maxPixels: number): Promise<ExecutionSummary> {
  if (plan.dryRun) {
    return summarize(
      plan.files.map((file) => ({ input: file.input, output: file.output, status: "skipped" })),
      true,
    );
  }

  // The Bun backend uses the same static codecs and geometry implementation on
  // each platform, keeping output behavior independent of the host image stack.
  Bun.Image.backend = "bun";

  const files: ExecutionFileResult[] = [];
  for (const file of plan.files) {
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

  return summarize(files, false);
}

export function createImageEngine(options: ImageEngineOptions = {}): ImageEngine {
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
  if (!Number.isInteger(maxPixels) || maxPixels <= 0) {
    throw new ImageEngineError("INVALID_ENGINE_OPTIONS", "maxPixels must be a positive integer.");
  }

  return {
    execute(plan) {
      return executePlan(plan, maxPixels);
    },
  };
}
