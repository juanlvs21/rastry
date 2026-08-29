export const PIPELINE_SCHEMA_VERSION = 1 as const;

export const supportedInputFormats = ["png", "jpeg", "webp"] as const;
export const supportedOutputFormats = ["png", "jpeg", "webp"] as const;

export type ImageFormat = (typeof supportedInputFormats)[number];

export function isSupportedInputFormat(value: unknown): value is ImageFormat {
  return typeof value === "string" && supportedInputFormats.some((format) => format === value);
}

export function isSupportedOutputFormat(value: unknown): value is ImageFormat {
  return typeof value === "string" && supportedOutputFormats.some((format) => format === value);
}

export type ResizeOperation = {
  type: "resize";
  width?: number;
  height?: number;
  fit?: "contain" | "cover" | "fill";
};

export type ConvertOperation = {
  type: "convert";
  format: ImageFormat;
  quality?: number;
};

export type StripMetadataOperation = {
  type: "strip-metadata";
};

export type PipelineOperation = ResizeOperation | ConvertOperation | StripMetadataOperation;

export type PipelineConfig = {
  version: typeof PIPELINE_SCHEMA_VERSION;
  name?: string;
  operations: PipelineOperation[];
};

export type PlanRequest = {
  inputs: string[];
  outputDirectory?: string;
  pipeline: PipelineConfig;
  overwrite?: boolean;
  dryRun?: boolean;
};

export type PlannedFile = {
  input: string;
  output: string;
};

export type ExecutionPlan = {
  dryRun: boolean;
  outputDirectory: string;
  files: PlannedFile[];
  pipeline: PipelineConfig;
  warnings: string[];
};

export type ExecutionFileStatus = "processed" | "skipped" | "failed";

export type ExecutionError = {
  code: string;
  message: string;
};

export type ExecutionFileResult = {
  input: string;
  output: string;
  status: ExecutionFileStatus;
  bytesBefore?: number;
  bytesAfter?: number;
  error?: ExecutionError;
};

export type ExecutionSummary = {
  dryRun: boolean;
  files: ExecutionFileResult[];
  processed: number;
  skipped: number;
  failed: number;
  bytesBefore: number;
  bytesAfter: number;
};
