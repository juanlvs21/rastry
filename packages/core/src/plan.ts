import { basename, dirname, extname, join, normalize, resolve } from "node:path";

import {
  PIPELINE_SCHEMA_VERSION,
  isSupportedOutputFormat,
  type ExecutionPlan,
  type ImageFormat,
  type PipelineConfig,
  type PlanRequest,
} from "@rastry/contracts";

import { RastryError } from "./errors";

const DEFAULT_OUTPUT_DIRECTORY = "rastry-output";
const PIPELINE_FIELDS = ["version", "name", "operations"] as const;
const RESIZE_FIELDS = ["type", "width", "height", "fit"] as const;
const CONVERT_FIELDS = ["type", "format", "quality"] as const;
const STRIP_METADATA_FIELDS = ["type"] as const;
const RESIZE_FITS = ["contain", "cover", "fill"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKnownFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  label: string,
): void {
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) {
      throw new RastryError(
        "INVALID_PIPELINE",
        `${label} contains an unsupported field: ${field}.`,
      );
    }
  }
}

function assertPositiveInteger(value: unknown, field: string): void {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
  ) {
    throw new RastryError("INVALID_PIPELINE", `${field} must be a positive integer.`);
  }
}

function isResizeFit(value: unknown): value is (typeof RESIZE_FITS)[number] {
  return typeof value === "string" && RESIZE_FITS.some((fit) => fit === value);
}

export function validatePipeline(pipeline: PipelineConfig): void {
  const value: unknown = pipeline;
  if (!isRecord(value)) {
    throw new RastryError("INVALID_PIPELINE", "Pipeline must be an object.");
  }

  if (value.version !== PIPELINE_SCHEMA_VERSION) {
    throw new RastryError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Pipeline version ${String(value.version)} is not supported. Expected ${PIPELINE_SCHEMA_VERSION}.`,
    );
  }

  assertKnownFields(value, PIPELINE_FIELDS, "Pipeline");

  if (value.name !== undefined && (typeof value.name !== "string" || value.name.length === 0)) {
    throw new RastryError("INVALID_PIPELINE", "Pipeline name must be a non-empty string.");
  }

  if (!Array.isArray(value.operations)) {
    throw new RastryError("INVALID_PIPELINE", "Pipeline operations must be an array.");
  }

  if (value.operations.length === 0) {
    throw new RastryError("INVALID_PIPELINE", "A pipeline must contain at least one operation.");
  }

  for (const operation of value.operations) {
    if (!isRecord(operation) || typeof operation.type !== "string") {
      throw new RastryError("INVALID_PIPELINE", "Every pipeline operation must declare a type.");
    }

    if (operation.type === "resize") {
      assertKnownFields(operation, RESIZE_FIELDS, "Resize operation");
      assertPositiveInteger(operation.width, "resize.width");
      assertPositiveInteger(operation.height, "resize.height");
      if (operation.width === undefined && operation.height === undefined) {
        throw new RastryError("INVALID_PIPELINE", "Resize requires width, height, or both.");
      }
      if (operation.fit !== undefined && !isResizeFit(operation.fit)) {
        throw new RastryError("INVALID_PIPELINE", "resize.fit must be contain, cover, or fill.");
      }
      continue;
    }

    if (operation.type === "convert") {
      assertKnownFields(operation, CONVERT_FIELDS, "Convert operation");
      if (!isSupportedOutputFormat(operation.format)) {
        throw new RastryError(
          "INVALID_PIPELINE",
          `Unsupported output format: ${String(operation.format)}.`,
        );
      }
      if (
        operation.quality !== undefined &&
        (typeof operation.quality !== "number" ||
          !Number.isInteger(operation.quality) ||
          operation.quality < 1 ||
          operation.quality > 100)
      ) {
        throw new RastryError("INVALID_PIPELINE", "Quality must be an integer between 1 and 100.");
      }
      continue;
    }

    if (operation.type === "strip-metadata") {
      assertKnownFields(operation, STRIP_METADATA_FIELDS, "Strip metadata operation");
      continue;
    }

    throw new RastryError("INVALID_PIPELINE", `Unsupported pipeline operation: ${operation.type}.`);
  }
}

function outputFormat(pipeline: PipelineConfig, inputExtension: string): ImageFormat | string {
  let convertedFormat: ImageFormat | undefined;
  for (const operation of pipeline.operations) {
    if (operation.type === "convert") {
      convertedFormat = operation.format;
    }
  }
  if (convertedFormat !== undefined) {
    return convertedFormat;
  }

  return inputExtension.replace(/^\./, "").toLowerCase() || "png";
}

function outputName(input: string, pipeline: PipelineConfig): string {
  const extension = extname(input);
  const stem = basename(input, extension);
  const format = outputFormat(pipeline, extension);
  const normalizedExtension = format === "jpeg" ? "jpg" : format;
  return `${stem}.${normalizedExtension}`;
}

function pathComparisonKey(path: string): string {
  const normalized = normalize(path);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function createExecutionPlan(request: PlanRequest): ExecutionPlan {
  validatePipeline(request.pipeline);
  const dryRun = request.dryRun ?? true;

  if (!Array.isArray(request.inputs) || request.inputs.length === 0) {
    throw new RastryError("NO_INPUT", "At least one input path is required.");
  }

  for (const input of request.inputs) {
    if (typeof input !== "string" || input.trim().length === 0) {
      throw new RastryError("INVALID_INPUT", "Input paths must be non-empty strings.");
    }
  }

  if (request.overwrite === true) {
    throw new RastryError(
      "OVERWRITE_NOT_AVAILABLE",
      "Overwrite is intentionally unavailable in the initial scaffold.",
    );
  }

  if (
    request.outputDirectory !== undefined &&
    (typeof request.outputDirectory !== "string" || request.outputDirectory.trim().length === 0)
  ) {
    throw new RastryError("INVALID_OUTPUT_DIRECTORY", "Output directory must be a non-empty path.");
  }

  const firstInput = resolve(request.inputs[0]!);
  const requestedOutput =
    request.outputDirectory ?? join(dirname(firstInput), DEFAULT_OUTPUT_DIRECTORY);
  const resolvedOutput = resolve(requestedOutput);
  const seenOutputs = new Set<string>();

  const files = request.inputs.map((input) => {
    const resolvedInput = resolve(input);
    const output = normalize(join(resolvedOutput, outputName(resolvedInput, request.pipeline)));
    const inputKey = pathComparisonKey(resolvedInput);
    const outputKey = pathComparisonKey(output);

    if (inputKey === outputKey) {
      throw new RastryError("OUTPUT_EQUALS_INPUT", `Output would overwrite input: ${input}`);
    }
    if (seenOutputs.has(outputKey)) {
      throw new RastryError(
        "OUTPUT_COLLISION",
        `Multiple inputs resolve to the same output: ${output}`,
      );
    }

    seenOutputs.add(outputKey);
    return { input: resolvedInput, output };
  });

  return {
    dryRun,
    outputDirectory: resolvedOutput,
    files,
    pipeline: request.pipeline,
    warnings: dryRun ? ["Dry run: no files were written."] : [],
  };
}
