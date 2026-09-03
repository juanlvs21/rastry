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

export const supportedAnchors = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

export type Anchor = (typeof supportedAnchors)[number];

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropOperation =
  | {
      type: "crop";
      area: CropArea;
    }
  | {
      type: "crop";
      width: number;
      height: number;
      anchor: Anchor;
    };

export type TrimOperation = {
  type: "trim";
  alphaThreshold?: number;
};

export type PaddingBackground =
  | {
      transparent: true;
    }
  | {
      color: `#${string}`;
      alpha?: number;
    };

export type PaddingOperation = {
  type: "padding";
  top: number;
  right: number;
  bottom: number;
  left: number;
  background: PaddingBackground;
};

export type ResizeOperation = {
  type: "resize";
  width?: number;
  height?: number;
  fit?: "contain" | "cover" | "fill";
  anchor?: Anchor;
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
  | CropOperation
  | TrimOperation
  | PaddingOperation
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
  dryRun?: boolean;
};

export type PlannedFile = {
  input: string;
  output: string;
  preflightError?: ExecutionError;
};

export type ExecutionPlan = {
  dryRun: boolean;
  outputDirectory: string;
  files: PlannedFile[];
  pipeline: PipelineConfig;
  warnings: string[];
};

export type ExecutionFileStatus = "processed" | "skipped" | "failed" | "cancelled";

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

export type ExecutionProgressPhase =
  | "started"
  | "file-started"
  | "file-finished"
  | "cancelled"
  | "completed";

export type ExecutionProgress = {
  phase: ExecutionProgressPhase;
  completed: number;
  total: number;
  file?: PlannedFile;
  result?: ExecutionFileResult;
};

export type ExecutionControl = {
  onProgress?: (progress: ExecutionProgress) => void;
  isCancelled?: () => boolean;
};

export type ExecutionSummary = {
  dryRun: boolean;
  total: number;
  files: ExecutionFileResult[];
  processed: number;
  skipped: number;
  failed: number;
  cancelled: number;
  bytesBefore: number;
  bytesAfter: number;
};
