import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

import type { PipelineConfig, PlanRequest } from "@rastry/contracts";
import { createExecutionPlan, RastryError } from "@rastry/core";

const webPipeline: PipelineConfig = {
  version: 1,
  operations: [
    { type: "resize", width: 1600, fit: "contain" },
    { type: "convert", format: "webp", quality: 82 },
    { type: "strip-metadata" },
  ],
};

function expectRastryError(code: string, action: () => unknown): void {
  let thrown: unknown;

  try {
    action();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(RastryError);
  expect((thrown as RastryError).code).toBe(code);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("safe transformation planning", () => {
  test("builds a deterministic plan with a safe derived output directory", () => {
    const plan = createExecutionPlan({
      inputs: ["photo.png"],
      pipeline: { version: 1, operations: [{ type: "convert", format: "webp", quality: 82 }] },
    });

    expect(plan).toMatchObject({
      dryRun: true,
      outputDirectory: resolve("rastry-output"),
      files: [{ input: resolve("photo.png"), output: resolve("rastry-output", "photo.webp") }],
    });
    expect(plan.warnings).toContain("Dry run: no files were written.");
  });

  test("preserves the pipeline and maps a batch into the explicit output directory", () => {
    const plan = createExecutionPlan({
      inputs: ["incoming/hero.png", "incoming/logo.jpg"],
      outputDirectory: "optimized",
      pipeline: webPipeline,
    });

    expect(plan.outputDirectory).toBe(resolve("optimized"));
    expect(plan.pipeline).toEqual(webPipeline);
    expect(plan.files).toEqual([
      { input: resolve("incoming/hero.png"), output: resolve("optimized", "hero.webp") },
      { input: resolve("incoming/logo.jpg"), output: resolve("optimized", "logo.webp") },
    ]);
  });

  test("uses stable output extensions for every supported format", () => {
    const formats = [
      { format: "png" as const, extension: "png" },
      { format: "jpeg" as const, extension: "jpg" },
      { format: "webp" as const, extension: "webp" },
    ];

    for (const { format, extension } of formats) {
      const plan = createExecutionPlan({
        inputs: ["photo.png"],
        outputDirectory: "optimized",
        pipeline: { version: 1, operations: [{ type: "convert", format }] },
      });

      expect(plan.files[0]?.output).toBe(resolve("optimized", `photo.${extension}`));
    }
  });

  test("uses the last conversion operation as the final output format", () => {
    const plan = createExecutionPlan({
      inputs: ["photo.png"],
      outputDirectory: "optimized",
      pipeline: {
        version: 1,
        operations: [
          { type: "convert", format: "png" },
          { type: "convert", format: "jpeg" },
        ],
      },
    });

    expect(plan.files[0]?.output).toBe(resolve("optimized", "photo.jpg"));
  });

  test("does not create an output directory while planning", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-safe-planning-"));
    const outputDirectory = join(temporaryRoot, "output");

    try {
      const plan = createExecutionPlan({
        inputs: [join(temporaryRoot, "photo.png")],
        outputDirectory,
        pipeline: webPipeline,
      });

      expect(plan.dryRun).toBe(true);
      expect(await pathExists(outputDirectory)).toBe(false);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("rejects requests that could overwrite or ambiguously name outputs", () => {
    expectRastryError("NO_INPUT", () => createExecutionPlan({ inputs: [], pipeline: webPipeline }));

    expectRastryError("OVERWRITE_NOT_AVAILABLE", () =>
      createExecutionPlan({ inputs: ["photo.png"], pipeline: webPipeline, overwrite: true }),
    );

    expectRastryError("OUTPUT_EQUALS_INPUT", () =>
      createExecutionPlan({
        inputs: ["photo.png"],
        outputDirectory: ".",
        pipeline: { version: 1, operations: [{ type: "convert", format: "png" }] },
      }),
    );

    expectRastryError("OUTPUT_COLLISION", () =>
      createExecutionPlan({
        inputs: ["first/photo.png", "second/photo.jpg"],
        outputDirectory: "optimized",
        pipeline: { version: 1, operations: [{ type: "convert", format: "webp" }] },
      }),
    );
  });

  test("rejects invalid pipeline configuration before planning", () => {
    const invalidRequests: Array<{ code: string; request: PlanRequest }> = [
      {
        code: "UNSUPPORTED_SCHEMA_VERSION",
        request: {
          inputs: ["photo.png"],
          pipeline: {
            version: 2,
            operations: [{ type: "convert", format: "webp" }],
          } as unknown as PipelineConfig,
        },
      },
      {
        code: "INVALID_PIPELINE",
        request: { inputs: ["photo.png"], pipeline: { version: 1, operations: [] } },
      },
      {
        code: "INVALID_PIPELINE",
        request: {
          inputs: ["photo.png"],
          pipeline: { version: 1, operations: [{ type: "resize" }] } as unknown as PipelineConfig,
        },
      },
      {
        code: "INVALID_PIPELINE",
        request: {
          inputs: ["photo.png"],
          pipeline: {
            version: 1,
            operations: [{ type: "convert", format: "webp", quality: 101 }],
          } as unknown as PipelineConfig,
        },
      },
      {
        code: "INVALID_PIPELINE",
        request: {
          inputs: ["photo.png"],
          pipeline: {
            version: 1,
            operations: [{ type: "rotate" }],
          } as unknown as PipelineConfig,
        },
      },
    ];

    for (const { code, request } of invalidRequests) {
      expectRastryError(code, () => createExecutionPlan(request));
    }
  });

  test("rejects empty input paths", () => {
    expectRastryError("INVALID_INPUT", () =>
      createExecutionPlan({ inputs: [""], pipeline: webPipeline }),
    );
  });

  test("accepts explicit geometry and rejects invalid operation combinations", () => {
    const plan = createExecutionPlan({
      inputs: ["photo.png"],
      pipeline: {
        version: 1,
        operations: [
          { type: "crop", width: 100, height: 80, anchor: "bottom-right" },
          {
            type: "padding",
            top: 4,
            right: 0,
            bottom: 4,
            left: 0,
            background: { transparent: true },
          },
          { type: "resize", width: 64, height: 64, fit: "cover", anchor: "center" },
          { type: "convert", format: "png" },
        ],
      },
    });

    expect(plan.pipeline.operations).toHaveLength(4);

    const invalidPipelines: PipelineConfig[] = [
      {
        version: 1,
        operations: [{ type: "resize", width: 100, height: 100, fit: "cover" } as never],
      },
      {
        version: 1,
        operations: [
          { type: "resize", width: 100, height: 100, fit: "contain", anchor: "center" } as never,
        ],
      },
      {
        version: 1,
        operations: [
          { type: "crop", area: { x: 0, y: 0, width: 10, height: 10 }, anchor: "center" } as never,
        ],
      },
      {
        version: 1,
        operations: [{ type: "crop", width: 100, height: 100 } as never],
      },
      {
        version: 1,
        operations: [{ type: "trim", alphaThreshold: 256 } as never],
      },
      {
        version: 1,
        operations: [
          {
            type: "padding",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: { color: "#ffffff" },
          } as never,
        ],
      },
      {
        version: 1,
        operations: [
          {
            type: "padding",
            top: 1,
            right: 0,
            bottom: 0,
            left: 0,
            background: { transparent: true, color: "#ffffff" },
          } as never,
        ],
      },
    ];

    for (const pipeline of invalidPipelines) {
      expectRastryError("INVALID_PIPELINE", () =>
        createExecutionPlan({ inputs: ["photo.png"], pipeline }),
      );
    }

    expectRastryError("INVALID_PIPELINE", () =>
      createExecutionPlan({
        inputs: ["photo.png"],
        pipeline: {
          version: 1,
          operations: [
            {
              type: "padding",
              top: 1,
              right: 0,
              bottom: 0,
              left: 0,
              background: { transparent: true },
            },
            { type: "convert", format: "jpeg" },
          ],
        },
      }),
    );

    expectRastryError("INVALID_PIPELINE", () =>
      createExecutionPlan({
        inputs: ["photo.jpg"],
        pipeline: {
          version: 1,
          operations: [
            {
              type: "padding",
              top: 1,
              right: 0,
              bottom: 0,
              left: 0,
              background: { transparent: true },
            },
          ],
        },
      }),
    );
  });
});
