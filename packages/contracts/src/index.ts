export const PIPELINE_SCHEMA_VERSION = 1 as const;

export const supportedInputFormats = ["png", "jpeg", "webp"] as const;
export const supportedOutputFormats = ["png", "jpeg", "webp"] as const;

export type ImageFormat = (typeof supportedInputFormats)[number];

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

export type PipelineOperation =
  | ResizeOperation
  | ConvertOperation
  | StripMetadataOperation;

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
};

export type PlannedFile = {
  input: string;
  output: string;
};

export type ExecutionPlan = {
  dryRun: true;
  outputDirectory: string;
  files: PlannedFile[];
  pipeline: PipelineConfig;
  warnings: string[];
};

