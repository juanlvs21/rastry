import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

import type { ExecutionFileResult, ExecutionSummary, PipelineConfig } from "@rastry/contracts";
import type { PlanningFileSystem, PlanningPathInfo } from "@rastry/core";
import type { ImageEngine } from "@rastry/image-engine";

import { DesktopService } from "../../src/bun/service";

const input = resolve("desktop-fixture.png");
const secondInput = resolve("desktop-fixture-2.png");
const outputDirectory = resolve("desktop-output");

const pipeline: PipelineConfig = {
  version: 1,
  operations: [{ type: "convert", format: "webp" }],
};

function fileResult(
  inputPath: string,
  outputPath: string,
  status: ExecutionFileResult["status"],
): ExecutionFileResult {
  return { input: inputPath, output: outputPath, status };
}

function summaryFor(
  plan: { files: readonly { input: string; output: string }[] },
  cancelled = false,
): ExecutionSummary {
  const files = plan.files.map((file) =>
    fileResult(file.input, file.output, cancelled ? "cancelled" : "processed"),
  );
  return {
    dryRun: false,
    total: files.length,
    files,
    processed: cancelled ? 0 : files.length,
    skipped: 0,
    failed: 0,
    cancelled: cancelled ? files.length : 0,
    bytesBefore: cancelled ? 0 : files.length * 10,
    bytesAfter: cancelled ? 0 : files.length * 5,
  };
}

function createDeferred<T>() {
  let settle: ((value: T | PromiseLike<T>) => void) | undefined;
  const promise = new Promise<T>((resolvePromise) => {
    settle = resolvePromise;
  });
  return {
    promise,
    resolve(value: T) {
      settle?.(value);
    },
  };
}

function createFileSystem(
  options: { outputExists?: () => boolean } = {},
): PlanningFileSystem & { inspected: string[] } {
  const inspected: string[] = [];
  const fileSystem = {
    inspected,
    async inspect(path: string): Promise<PlanningPathInfo | undefined> {
      inspected.push(path);
      if (path === input || path === secondInput) {
        return { kind: "file", readable: true, writable: true };
      }
      if (path === outputDirectory && options.outputExists?.()) {
        return { kind: "directory", readable: true, writable: true };
      }
      if (path === outputDirectory) return undefined;
      if (path === resolve(outputDirectory, "desktop-fixture.webp") && options.outputExists?.()) {
        return { kind: "file", readable: true, writable: true };
      }
      return undefined;
    },
    async readDirectory(): Promise<readonly []> {
      return [];
    },
  } satisfies PlanningFileSystem & { inspected: string[] };
  return fileSystem;
}

function createEngine(
  onExecute?: (plan: Parameters<ImageEngine["execute"]>[0]) => void,
): ImageEngine {
  return {
    async execute(plan, control) {
      onExecute?.(plan);
      control?.onProgress?.({ phase: "started", completed: 0, total: plan.files.length });
      const cancelled = control?.isCancelled?.() ?? false;
      if (cancelled) {
        const summary = summaryFor(plan, true);
        control?.onProgress?.({
          phase: "cancelled",
          completed: summary.total,
          total: summary.total,
        });
        return summary;
      }
      const summary = summaryFor(plan);
      control?.onProgress?.({ phase: "completed", completed: summary.total, total: summary.total });
      return summary;
    },
  };
}

describe("desktop main-process service", () => {
  test("rejects malformed and unsupported RPC payloads before filesystem access", async () => {
    const fileSystem = createFileSystem();
    const service = new DesktopService({ fileSystem, engine: createEngine() });
    const handlers = service.createRequestHandlers();

    const malformed = await handlers.preview({ inputs: "not-an-array" });
    expect(malformed).toEqual({
      ok: false,
      error: { code: "INVALID_RPC_PAYLOAD", message: "At least one input path is required." },
    });
    expect(fileSystem.inspected).toEqual([]);

    const unsupported = await handlers.preview({
      inputs: [input],
      outputDirectory,
      pipeline: { version: 99, operations: [{ type: "convert", format: "webp" }] },
    });
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) expect(unsupported.error.code).toBe("UNSUPPORTED_SCHEMA_VERSION");
    expect(fileSystem.inspected).toEqual([]);
  });

  test("creates a dry-run plan and retains no engine side effects", async () => {
    let executeCount = 0;
    const fileSystem = createFileSystem();
    const service = new DesktopService({
      fileSystem,
      engine: createEngine(() => {
        executeCount += 1;
      }),
      createRunId: () => "run-preview",
    });

    const response = await service.createRequestHandlers().preview({
      inputs: [input],
      outputDirectory,
      pipeline,
    });

    expect(response).toEqual({
      ok: true,
      value: {
        runId: "run-preview",
        plan: {
          dryRun: true,
          outputDirectory,
          files: [{ input, output: resolve(outputDirectory, "desktop-fixture.webp") }],
          pipeline,
          warnings: ["Dry run: no files were written."],
        },
      },
    });
    expect(executeCount).toBe(0);
  });

  test("revalidates output conflicts after preview and streams typed progress", async () => {
    let outputExists = false;
    const progress: string[] = [];
    let executionPlan: Parameters<ImageEngine["execute"]>[0] | undefined;
    const fileSystem = createFileSystem({ outputExists: () => outputExists });
    const service = new DesktopService({
      fileSystem,
      engine: createEngine((plan) => {
        executionPlan = plan;
      }),
      createRunId: () => "run-conflict",
      onProgress: (event) => progress.push(`${event.runId}:${event.progress.phase}`),
    });
    const handlers = service.createRequestHandlers();

    const preview = await handlers.preview({ inputs: [input], outputDirectory, pipeline });
    expect(preview.ok).toBe(true);
    outputExists = true;

    const executed = await handlers.execute({ runId: "run-conflict" });
    expect(executed.ok).toBe(true);
    expect(executionPlan?.files[0]?.preflightError?.code).toBe("OUTPUT_EXISTS");
    expect(progress).toEqual(["run-conflict:started", "run-conflict:completed"]);
  });

  test("cancels a preview before execution without invoking the engine", async () => {
    let executeCount = 0;
    const service = new DesktopService({
      fileSystem: createFileSystem(),
      engine: createEngine(() => {
        executeCount += 1;
      }),
      createRunId: () => "run-cancelled",
    });
    const handlers = service.createRequestHandlers();
    await handlers.preview({ inputs: [input, secondInput], outputDirectory, pipeline });

    expect(await handlers.cancel({ runId: "run-cancelled" })).toEqual({
      ok: true,
      value: { accepted: true, runId: "run-cancelled" },
    });
    const executed = await handlers.execute({ runId: "run-cancelled" });
    expect(executed.ok).toBe(true);
    if (executed.ok) {
      expect(executed.value.cancelled).toBe(2);
      expect(executed.value.processed).toBe(0);
    }
    expect(executeCount).toBe(0);
  });

  test("cancels an active run cooperatively and preserves completed state", async () => {
    const started = createDeferred<void>();
    const released = createDeferred<void>();
    const service = new DesktopService({
      fileSystem: createFileSystem(),
      engine: {
        async execute(plan, control) {
          started.resolve(undefined);
          await released.promise;
          return summaryFor(plan, control?.isCancelled?.() ?? false);
        },
      },
      createRunId: () => "run-active-cancel",
    });
    const handlers = service.createRequestHandlers();
    await handlers.preview({ inputs: [input], outputDirectory, pipeline });

    const execution = handlers.execute({ runId: "run-active-cancel" });
    await started.promise;
    expect(await handlers.cancel({ runId: "run-active-cancel" })).toEqual({
      ok: true,
      value: { accepted: true, runId: "run-active-cancel" },
    });
    released.resolve(undefined);

    const result = await execution;
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.cancelled).toBe(1);
  });

  test("normalizes native selections and returns serializable dialog results", async () => {
    const service = new DesktopService({
      fileSystem: createFileSystem(),
      engine: createEngine(),
      dialog: {
        async selectInputs() {
          return ["selected.png"];
        },
        async selectInputFolder() {
          return ["selected-folder"];
        },
        async selectOutputDirectory() {
          return ["selected-output", "ignored-second-path"];
        },
      },
    });
    const handlers = service.createRequestHandlers();

    expect(await handlers.selectInputs({})).toEqual({
      ok: true,
      value: { paths: [resolve("selected.png")], cancelled: false },
    });
    expect(await handlers.selectInputFolder({})).toEqual({
      ok: true,
      value: { paths: [resolve("selected-folder")], cancelled: false },
    });
    expect(await handlers.selectOutputDirectory({})).toEqual({
      ok: true,
      value: { paths: [resolve("selected-output")], cancelled: false },
    });
  });
});
