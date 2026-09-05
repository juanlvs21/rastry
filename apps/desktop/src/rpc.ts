import type {
  ExecutionPlan,
  ExecutionProgress,
  ExecutionSummary,
  PipelineConfig,
} from "@rastry/contracts";

export type DesktopRpcError = {
  code: string;
  message: string;
};

export type DesktopRpcResult<T> = { ok: true; value: T } | { ok: false; error: DesktopRpcError };

export type DesktopSelection = {
  paths: string[];
  cancelled: boolean;
};

export type DesktopPreview = {
  runId: string;
  plan: ExecutionPlan;
};

export type DesktopProgressEvent = {
  runId: string;
  progress: ExecutionProgress;
};

export type DesktopRpcSchema = {
  bun: {
    requests: {
      selectInputs: {
        params: Record<string, never>;
        response: DesktopRpcResult<DesktopSelection>;
      };
      selectInputFolder: {
        params: Record<string, never>;
        response: DesktopRpcResult<DesktopSelection>;
      };
      selectOutputDirectory: {
        params: Record<string, never>;
        response: DesktopRpcResult<DesktopSelection>;
      };
      preview: {
        params: {
          inputs: string[];
          outputDirectory: string | null;
          pipeline: PipelineConfig;
        };
        response: DesktopRpcResult<DesktopPreview>;
      };
      execute: {
        params: { runId: string };
        response: DesktopRpcResult<ExecutionSummary>;
      };
      cancel: {
        params: { runId: string };
        response: DesktopRpcResult<{ accepted: true; runId: string }>;
      };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {
      executionProgress: DesktopProgressEvent;
    };
  };
};
