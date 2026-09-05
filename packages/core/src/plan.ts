import { basename, dirname, extname, join, normalize, resolve } from "node:path";

import {
  PIPELINE_SCHEMA_VERSION,
  isSupportedOutputFormat,
  supportedAnchors,
  type ExecutionError,
  type ExecutionPlan,
  type ImageFormat,
  type PipelineConfig,
  type PlanRequest,
} from "@rastry/contracts";

import { RastryError } from "./errors";
import { discoverInputs, type PlanningFileSystem } from "./discovery";
import { pathComparisonKey } from "./paths";

const PIPELINE_FIELDS = ["version", "name", "operations"] as const;
const RESIZE_FIELDS = ["type", "width", "height", "fit", "anchor"] as const;
const CROP_FIELDS = ["type", "area", "width", "height", "anchor"] as const;
const CROP_AREA_FIELDS = ["x", "y", "width", "height"] as const;
const TRIM_FIELDS = ["type", "alphaThreshold"] as const;
const PADDING_FIELDS = ["type", "top", "right", "bottom", "left", "background"] as const;
const PADDING_BACKGROUND_FIELDS = ["transparent", "color", "alpha"] as const;
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

function assertNonNegativeInteger(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new RastryError("INVALID_PIPELINE", `${field} must be a non-negative integer.`);
  }
}

function assertByte(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 255) {
    throw new RastryError("INVALID_PIPELINE", `${field} must be an integer between 0 and 255.`);
  }
}

function isAnchor(value: unknown): boolean {
  return typeof value === "string" && supportedAnchors.some((anchor) => anchor === value);
}

function isTransparentBackground(value: Record<string, unknown>): boolean {
  return value.transparent === true && value.color === undefined && value.alpha === undefined;
}

function isTransparentPadding(operation: Record<string, unknown>): boolean {
  const background = operation.background;
  if (!isRecord(background)) {
    return false;
  }
  if (isTransparentBackground(background)) {
    return true;
  }
  return (
    typeof background.color === "string" &&
    typeof background.alpha === "number" &&
    background.alpha < 255
  );
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
      if (operation.anchor !== undefined && !isAnchor(operation.anchor)) {
        throw new RastryError("INVALID_PIPELINE", "resize.anchor is not a supported anchor.");
      }
      if (operation.fit === "cover") {
        if (operation.width === undefined || operation.height === undefined) {
          throw new RastryError("INVALID_PIPELINE", "resize.fit=cover requires width and height.");
        }
        if (operation.anchor === undefined) {
          throw new RastryError("INVALID_PIPELINE", "resize.fit=cover requires an anchor.");
        }
      } else if (operation.anchor !== undefined) {
        throw new RastryError(
          "INVALID_PIPELINE",
          "resize.anchor is only valid when resize.fit is cover.",
        );
      }
      if (
        operation.fit === "fill" &&
        (operation.width === undefined || operation.height === undefined)
      ) {
        throw new RastryError("INVALID_PIPELINE", "resize.fit=fill requires width and height.");
      }
      continue;
    }

    if (operation.type === "crop") {
      assertKnownFields(operation, CROP_FIELDS, "Crop operation");
      const hasArea = operation.area !== undefined;
      const hasTargetDimensions = operation.width !== undefined || operation.height !== undefined;
      const hasAnchor = operation.anchor !== undefined;

      if (hasArea) {
        if (!isRecord(operation.area)) {
          throw new RastryError("INVALID_PIPELINE", "crop.area must be an object.");
        }
        assertKnownFields(operation.area, CROP_AREA_FIELDS, "Crop area");
        assertNonNegativeInteger(operation.area.x, "crop.area.x");
        assertNonNegativeInteger(operation.area.y, "crop.area.y");
        assertPositiveInteger(operation.area.width, "crop.area.width");
        assertPositiveInteger(operation.area.height, "crop.area.height");
        if (hasTargetDimensions || hasAnchor) {
          throw new RastryError(
            "INVALID_PIPELINE",
            "crop.area cannot be combined with width, height, or anchor.",
          );
        }
      } else {
        assertPositiveInteger(operation.width, "crop.width");
        assertPositiveInteger(operation.height, "crop.height");
        if (operation.width === undefined || operation.height === undefined) {
          throw new RastryError("INVALID_PIPELINE", "Anchored crop requires width and height.");
        }
        if (operation.anchor === undefined || !isAnchor(operation.anchor)) {
          throw new RastryError("INVALID_PIPELINE", "Anchored crop requires a supported anchor.");
        }
      }
      continue;
    }

    if (operation.type === "trim") {
      assertKnownFields(operation, TRIM_FIELDS, "Trim operation");
      if (operation.alphaThreshold !== undefined) {
        assertByte(operation.alphaThreshold, "trim.alphaThreshold");
      }
      continue;
    }

    if (operation.type === "padding") {
      assertKnownFields(operation, PADDING_FIELDS, "Padding operation");
      assertNonNegativeInteger(operation.top, "padding.top");
      assertNonNegativeInteger(operation.right, "padding.right");
      assertNonNegativeInteger(operation.bottom, "padding.bottom");
      assertNonNegativeInteger(operation.left, "padding.left");
      if (
        operation.top === 0 &&
        operation.right === 0 &&
        operation.bottom === 0 &&
        operation.left === 0
      ) {
        throw new RastryError("INVALID_PIPELINE", "Padding requires at least one non-zero side.");
      }
      if (!isRecord(operation.background)) {
        throw new RastryError("INVALID_PIPELINE", "Padding background must be an object.");
      }
      assertKnownFields(operation.background, PADDING_BACKGROUND_FIELDS, "Padding background");
      const background = operation.background;
      if (background.transparent !== undefined) {
        if (!isTransparentBackground(background)) {
          throw new RastryError(
            "INVALID_PIPELINE",
            "Transparent padding background cannot be combined with color or alpha.",
          );
        }
      } else {
        if (typeof background.color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(background.color)) {
          throw new RastryError(
            "INVALID_PIPELINE",
            "padding.background.color must use the #RRGGBB format.",
          );
        }
        if (background.alpha !== undefined) {
          assertByte(background.alpha, "padding.background.alpha");
        }
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

function outputName(
  input: string,
  pipeline: PipelineConfig,
  useDefaultOutputNaming: boolean,
): string {
  const extension = extname(input);
  const stem = basename(input, extension);
  const format = outputFormat(pipeline, extension);
  const normalizedExtension = format === "jpeg" ? "jpg" : format;
  return `${stem}${useDefaultOutputNaming ? "-rastry" : ""}.${normalizedExtension}`;
}

function assertPipelineCompatibility(pipeline: PipelineConfig, inputs: readonly string[]): void {
  let transparentPadding = false;
  for (const operation of pipeline.operations) {
    if (operation.type === "padding" && isTransparentPadding(operation)) {
      transparentPadding = true;
    }
    if (operation.type === "convert" && operation.format === "jpeg" && transparentPadding) {
      throw new RastryError(
        "INVALID_PIPELINE",
        "Transparent padding cannot be followed by JPEG conversion.",
      );
    }
  }

  if (transparentPadding) {
    const finalConversionFormat = pipeline.operations.reduce<ImageFormat | undefined>(
      (format, operation) => (operation.type === "convert" ? operation.format : format),
      undefined,
    );
    for (const input of inputs) {
      const inputExtension = extname(input).replace(/^\./, "").toLowerCase();
      const inputFormat = inputExtension === "jpg" ? "jpeg" : inputExtension || "png";
      if ((finalConversionFormat ?? inputFormat) === "jpeg") {
        throw new RastryError(
          "INVALID_PIPELINE",
          "Transparent padding cannot produce a JPEG output.",
        );
      }
    }
  }
}

function validatePlanRequest(request: PlanRequest): void {
  validatePipeline(request.pipeline);

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
}

function resolveOutputDirectory(request: PlanRequest): string {
  const firstInput = resolve(request.inputs[0]!);
  const requestedOutput = request.outputDirectory ?? dirname(firstInput);
  return resolve(requestedOutput);
}

async function preflightOutputDirectory(
  outputDirectory: string,
  fileSystem: PlanningFileSystem,
): Promise<void> {
  let output: Awaited<ReturnType<PlanningFileSystem["inspect"]>>;
  try {
    output = await fileSystem.inspect(outputDirectory);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;
    throw new RastryError(
      code === "EACCES" || code === "EPERM" ? "OUTPUT_NOT_WRITABLE" : "OUTPUT_PREFLIGHT_FAILED",
      `The output directory could not be inspected: ${outputDirectory}.`,
    );
  }
  if (output === undefined) return;
  if (output.kind !== "directory") {
    throw new RastryError(
      "INVALID_OUTPUT_DIRECTORY",
      `The output path is not a directory: ${outputDirectory}`,
    );
  }
  if (!output.writable) {
    throw new RastryError(
      "OUTPUT_NOT_WRITABLE",
      `The output directory cannot be written: ${outputDirectory}`,
    );
  }
}

function buildExecutionPlan(
  request: PlanRequest,
  preflightErrors: ReadonlyMap<string, ExecutionError> = new Map(),
  additionalWarnings: readonly string[] = [],
): ExecutionPlan {
  const dryRun = request.dryRun ?? true;
  const resolvedOutput = resolveOutputDirectory(request);
  const useDefaultOutputNaming = request.outputDirectory === undefined;
  const seenOutputs = new Set<string>();

  const files = request.inputs.map((input) => {
    const resolvedInput = resolve(input);
    const output = normalize(
      join(resolvedOutput, outputName(resolvedInput, request.pipeline, useDefaultOutputNaming)),
    );
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
    const preflightError = preflightErrors.get(resolvedInput);
    return preflightError === undefined
      ? { input: resolvedInput, output }
      : { input: resolvedInput, output, preflightError };
  });

  return {
    dryRun,
    outputDirectory: resolvedOutput,
    files,
    pipeline: request.pipeline,
    warnings: [...(dryRun ? ["Dry run: no files were written."] : []), ...additionalWarnings],
  };
}

export function createExecutionPlan(request: PlanRequest): ExecutionPlan {
  validatePlanRequest(request);
  assertPipelineCompatibility(request.pipeline, request.inputs);
  return buildExecutionPlan(request);
}

export async function createExecutionPlanFromInputs(
  request: PlanRequest,
  fileSystem: PlanningFileSystem,
): Promise<ExecutionPlan> {
  validatePlanRequest(request);
  const outputDirectory = resolveOutputDirectory(request);
  await preflightOutputDirectory(outputDirectory, fileSystem);
  const discovered = await discoverInputs(request.inputs, outputDirectory, fileSystem);
  assertPipelineCompatibility(request.pipeline, discovered.inputs);

  const plan = buildExecutionPlan(
    { ...request, inputs: discovered.inputs },
    discovered.preflightErrors,
    discovered.warnings,
  );
  const outputPreflightErrors = new Map<string, ExecutionError>();

  for (const file of plan.files) {
    if (file.preflightError !== undefined) {
      continue;
    }
    try {
      const output = await fileSystem.inspect(file.output);
      if (output !== undefined) {
        outputPreflightErrors.set(file.input, {
          code: "OUTPUT_EXISTS",
          message: `Refusing to overwrite existing output: ${file.output}`,
        });
      }
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : undefined;
      outputPreflightErrors.set(file.input, {
        code:
          code === "EACCES" || code === "EPERM" ? "OUTPUT_NOT_WRITABLE" : "OUTPUT_PREFLIGHT_FAILED",
        message: `The output path could not be inspected: ${file.output}.`,
      });
    }
  }

  if (outputPreflightErrors.size === 0) {
    return plan;
  }

  return {
    ...plan,
    files: plan.files.map((file) => {
      const preflightError = outputPreflightErrors.get(file.input);
      return preflightError === undefined ? file : { ...file, preflightError };
    }),
  };
}
