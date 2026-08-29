import { basename, dirname, extname, isAbsolute, join, normalize, resolve } from "node:path";

import {
  PIPELINE_SCHEMA_VERSION,
  supportedOutputFormats,
  type ExecutionPlan,
  type ImageFormat,
  type PipelineConfig,
  type PlanRequest,
} from "@rastry/contracts";

import { RastryError } from "./errors";

const DEFAULT_OUTPUT_DIRECTORY = "rastry-output";

function assertPositiveInteger(value: number | undefined, field: string): void {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    throw new RastryError("INVALID_PIPELINE", `${field} must be a positive integer.`);
  }
}

export function validatePipeline(pipeline: PipelineConfig): void {
  if (pipeline.version !== PIPELINE_SCHEMA_VERSION) {
    throw new RastryError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Pipeline version ${pipeline.version} is not supported. Expected ${PIPELINE_SCHEMA_VERSION}.`,
    );
  }

  if (pipeline.operations.length === 0) {
    throw new RastryError("INVALID_PIPELINE", "A pipeline must contain at least one operation.");
  }

  for (const operation of pipeline.operations) {
    if (operation.type === "resize") {
      assertPositiveInteger(operation.width, "resize.width");
      assertPositiveInteger(operation.height, "resize.height");
      if (operation.width === undefined && operation.height === undefined) {
        throw new RastryError("INVALID_PIPELINE", "Resize requires width, height, or both.");
      }
    }

    if (operation.type === "convert") {
      if (!supportedOutputFormats.includes(operation.format)) {
        throw new RastryError(
          "INVALID_PIPELINE",
          `Unsupported output format: ${operation.format}.`,
        );
      }
      if (
        operation.quality !== undefined &&
        (!Number.isInteger(operation.quality) || operation.quality < 1 || operation.quality > 100)
      ) {
        throw new RastryError("INVALID_PIPELINE", "Quality must be an integer between 1 and 100.");
      }
    }
  }
}

function outputFormat(pipeline: PipelineConfig, inputExtension: string): ImageFormat | string {
  const convert = pipeline.operations.find((operation) => operation.type === "convert");
  if (convert?.type === "convert") {
    return convert.format;
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

export function createExecutionPlan(request: PlanRequest): ExecutionPlan {
  validatePipeline(request.pipeline);

  if (request.inputs.length === 0) {
    throw new RastryError("NO_INPUT", "At least one input path is required.");
  }

  if (request.overwrite === true) {
    throw new RastryError(
      "OVERWRITE_NOT_AVAILABLE",
      "Overwrite is intentionally unavailable in the initial scaffold.",
    );
  }

  const firstInput = resolve(request.inputs[0]!);
  const requestedOutput =
    request.outputDirectory ?? join(dirname(firstInput), DEFAULT_OUTPUT_DIRECTORY);
  const resolvedOutput = resolve(requestedOutput);
  const seenOutputs = new Set<string>();

  const files = request.inputs.map((input) => {
    const resolvedInput = resolve(input);
    const output = normalize(join(resolvedOutput, outputName(resolvedInput, request.pipeline)));

    if (resolvedInput === output) {
      throw new RastryError("OUTPUT_EQUALS_INPUT", `Output would overwrite input: ${input}`);
    }
    if (seenOutputs.has(output)) {
      throw new RastryError(
        "OUTPUT_COLLISION",
        `Multiple inputs resolve to the same output: ${output}`,
      );
    }

    seenOutputs.add(output);
    return { input: resolvedInput, output };
  });

  return {
    dryRun: true,
    outputDirectory: isAbsolute(requestedOutput) ? normalize(requestedOutput) : resolvedOutput,
    files,
    pipeline: request.pipeline,
    warnings: ["Planning only: the image engine is not wired to filesystem writes yet."],
  };
}
