import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type {
  ExecutionFileResult,
  ExecutionPlan,
  ExecutionProgress,
  ExecutionSummary,
  PipelineConfig,
  PlanRequest,
} from "@rastry/contracts";
import {
  createExecutionPlanFromInputs,
  RastryError,
  type PlanningFileSystem,
  validatePipeline,
} from "@rastry/core";
import { ImageEngineError, type ImageEngine } from "@rastry/image-engine";

import type {
  DesktopPreview,
  DesktopProgressEvent,
  DesktopRpcError,
  DesktopRpcResult,
  DesktopRpcSchema,
  DesktopSelection,
} from "../rpc";

export type DesktopDialog = {
  selectInputs(): Promise<readonly string[]>;
  selectOutputDirectory(): Promise<readonly string[]>;
};

export type DesktopServiceDependencies = {
  fileSystem: PlanningFileSystem;
  engine: ImageEngine;
  dialog?: DesktopDialog;
  createRunId?: () => string;
  onProgress?: (event: DesktopProgressEvent) => void;
};

type DesktopRequests = DesktopRpcSchema["bun"]["requests"];
type DesktopRequestHandlers = {
  [K in keyof DesktopRequests]: (params: unknown) => Promise<DesktopRequests[K]["response"]>;
};

type PlanInput = {
  inputs: string[];
  outputDirectory: string | null;
  pipeline: PipelineConfig;
};

type ActiveRun = {
  runId: string;
  request: PlanInput;
  plan: ExecutionPlan;
  phase: "preview" | "running";
  cancelRequested: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail<T>(error: DesktopRpcError): DesktopRpcResult<T> {
  return { ok: false, error };
}

function succeed<T>(value: T): DesktopRpcResult<T> {
  return { ok: true, value };
}

function invalidPayload(message: string): RastryError {
  return new RastryError("INVALID_RPC_PAYLOAD", message);
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw invalidPayload(`${label} must be an object.`);
  }
  return value;
}

function readPathList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RastryError("INVALID_RPC_PAYLOAD", "At least one input path is required.");
  }

  return value.map((path, index) => {
    if (typeof path !== "string" || path.trim().length === 0) {
      throw invalidPayload(`inputs[${index}] must be a non-empty path.`);
    }
    return resolve(path);
  });
}

function readPreviewRequest(value: unknown): PlanInput {
  const request = readObject(value, "Preview request");
  const inputs = readPathList(request.inputs);
  const outputDirectory = request.outputDirectory;
  if (
    outputDirectory !== undefined &&
    outputDirectory !== null &&
    (typeof outputDirectory !== "string" || outputDirectory.trim().length === 0)
  ) {
    throw new RastryError(
      "INVALID_RPC_PAYLOAD",
      "outputDirectory must be null or a non-empty path.",
    );
  }

  if (!isRecord(request.pipeline)) {
    throw invalidPayload("pipeline must be an object.");
  }
  const pipeline = request.pipeline as unknown as PipelineConfig;

  // The core validator is deliberately run at the RPC boundary, before any
  // filesystem discovery can happen.
  validatePipeline(pipeline);

  return {
    inputs,
    outputDirectory:
      outputDirectory === undefined || outputDirectory === null ? null : resolve(outputDirectory),
    pipeline,
  };
}

function readRunId(value: unknown, label: string): string {
  const request = readObject(value, label);
  if (typeof request.runId !== "string" || request.runId.trim().length === 0) {
    throw invalidPayload("runId must be a non-empty string.");
  }
  return request.runId;
}

function toError(error: unknown): DesktopRpcError {
  if (error instanceof RastryError || error instanceof ImageEngineError) {
    return { code: error.code, message: error.message };
  }

  if (isRecord(error)) {
    const code = error.code;
    const message = error.message;
    if (typeof code === "string" && typeof message === "string") {
      return { code, message };
    }
  }

  return {
    code: "RPC_INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "The desktop request failed.",
  };
}

function normalizeDialogPaths(paths: readonly string[]): string[] {
  return paths.map((path, index) => {
    if (typeof path !== "string" || path.trim().length === 0) {
      throw invalidPayload(`The native dialog returned an invalid path at index ${index}.`);
    }
    return resolve(path);
  });
}

function cancelledSummary(plan: ExecutionPlan): ExecutionSummary {
  const files: ExecutionFileResult[] = plan.files.map((file) => ({
    input: file.input,
    output: file.output,
    status: "cancelled",
  }));
  return {
    dryRun: false,
    total: files.length,
    files,
    processed: 0,
    skipped: 0,
    failed: 0,
    cancelled: files.length,
    bytesBefore: 0,
    bytesAfter: 0,
  };
}

export class DesktopService {
  private readonly fileSystem: PlanningFileSystem;
  private readonly engine: ImageEngine;
  private readonly dialog: DesktopDialog | undefined;
  private readonly createRunId: () => string;
  private readonly progressSink: ((event: DesktopProgressEvent) => void) | undefined;
  private activeRun: ActiveRun | undefined;

  constructor(dependencies: DesktopServiceDependencies) {
    this.fileSystem = dependencies.fileSystem;
    this.engine = dependencies.engine;
    this.dialog = dependencies.dialog;
    this.createRunId = dependencies.createRunId ?? randomUUID;
    this.progressSink = dependencies.onProgress;
  }

  createRequestHandlers(): DesktopRequestHandlers {
    return {
      selectInputs: (params) => this.selectInputs(params),
      selectOutputDirectory: (params) => this.selectOutputDirectory(params),
      preview: (params) => this.preview(params),
      execute: (params) => this.execute(params),
      cancel: (params) => this.cancel(params),
    };
  }

  private async selectInputs(params: unknown): Promise<DesktopRpcResult<DesktopSelection>> {
    try {
      readObject(params, "Select inputs request");
      if (this.dialog === undefined) {
        throw new RastryError("DIALOG_UNAVAILABLE", "Input selection is unavailable.");
      }
      const paths = normalizeDialogPaths(await this.dialog.selectInputs());
      return succeed({ paths, cancelled: paths.length === 0 });
    } catch (error) {
      return fail(toError(error));
    }
  }

  private async selectOutputDirectory(
    params: unknown,
  ): Promise<DesktopRpcResult<DesktopSelection>> {
    try {
      readObject(params, "Select output directory request");
      if (this.dialog === undefined) {
        throw new RastryError("DIALOG_UNAVAILABLE", "Output directory selection is unavailable.");
      }
      const paths = normalizeDialogPaths(await this.dialog.selectOutputDirectory());
      return succeed({ paths: paths.slice(0, 1), cancelled: paths.length === 0 });
    } catch (error) {
      return fail(toError(error));
    }
  }

  private async preview(value: unknown): Promise<DesktopRpcResult<DesktopPreview>> {
    try {
      if (this.activeRun?.phase === "running") {
        throw new RastryError("RUN_IN_PROGRESS", "An image run is already in progress.");
      }
      const request = readPreviewRequest(value);
      const planRequest = this.toPlanRequest(request, true);
      const plan = await createExecutionPlanFromInputs(planRequest, this.fileSystem);
      const runId = this.createRunId();
      this.activeRun = {
        runId,
        request,
        plan,
        phase: "preview",
        cancelRequested: false,
      };
      return succeed({ runId, plan });
    } catch (error) {
      return fail(toError(error));
    }
  }

  private async execute(value: unknown): Promise<DesktopRpcResult<ExecutionSummary>> {
    let runId: string;
    try {
      runId = readRunId(value, "Execute request");
    } catch (error) {
      return fail(toError(error));
    }

    const activeRun = this.activeRun;
    if (activeRun === undefined || activeRun.runId !== runId) {
      return fail({
        code: "RUN_NOT_FOUND",
        message: "The requested preview run is not available.",
      });
    }
    if (activeRun.phase === "running") {
      return fail({ code: "RUN_IN_PROGRESS", message: "The requested run is already executing." });
    }

    if (activeRun.cancelRequested) {
      const summary = cancelledSummary(activeRun.plan);
      this.emitProgress(runId, {
        phase: "cancelled",
        completed: summary.total,
        total: summary.total,
      });
      this.emitProgress(runId, {
        phase: "completed",
        completed: summary.total,
        total: summary.total,
      });
      this.activeRun = undefined;
      return succeed(summary);
    }

    activeRun.phase = "running";
    try {
      // Rebuild the plan against the current filesystem immediately before the
      // engine can create any output. The engine also uses exclusive creation.
      const freshPlan = await createExecutionPlanFromInputs(
        this.toPlanRequest(activeRun.request, false),
        this.fileSystem,
      );
      const summary = await this.engine.execute(freshPlan, {
        isCancelled: () => this.activeRun?.cancelRequested ?? false,
        onProgress: (progress) => this.emitProgress(runId, progress),
      });
      return succeed(summary);
    } catch (error) {
      return fail(toError(error));
    } finally {
      if (this.activeRun?.runId === runId) this.activeRun = undefined;
    }
  }

  private async cancel(
    value: unknown,
  ): Promise<DesktopRpcResult<{ accepted: true; runId: string }>> {
    try {
      const runId = readRunId(value, "Cancel request");
      if (this.activeRun === undefined || this.activeRun.runId !== runId) {
        throw new RastryError("RUN_NOT_FOUND", "The requested preview run is not available.");
      }
      this.activeRun.cancelRequested = true;
      return succeed({ accepted: true, runId });
    } catch (error) {
      return fail(toError(error));
    }
  }

  private toPlanRequest(request: PlanInput, dryRun: boolean): PlanRequest {
    return {
      inputs: request.inputs,
      pipeline: request.pipeline,
      dryRun,
      ...(request.outputDirectory === null ? {} : { outputDirectory: request.outputDirectory }),
    };
  }

  private emitProgress(runId: string, progress: ExecutionProgress): void {
    try {
      this.progressSink?.({ runId, progress });
    } catch {
      // A disconnected webview must not interrupt image processing.
    }
  }
}
