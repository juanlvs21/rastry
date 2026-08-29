import { describe, expect, test } from "bun:test";
import { sep } from "node:path";

import { createExecutionPlan, RastryError } from "../src";

describe("createExecutionPlan", () => {
  test("places output outside the input path by default", () => {
    const plan = createExecutionPlan({
      inputs: ["photo.png"],
      pipeline: {
        version: 1,
        operations: [{ type: "convert", format: "webp", quality: 82 }],
      },
    });

    expect(plan.dryRun).toBe(true);
    expect(plan.files[0]?.output).toEndWith(`rastry-output${sep}photo.webp`);
  });

  test("rejects output collisions", () => {
    expect(() =>
      createExecutionPlan({
        inputs: ["first/photo.png", "second/photo.jpg"],
        outputDirectory: "output",
        pipeline: { version: 1, operations: [{ type: "convert", format: "webp" }] },
      }),
    ).toThrow(RastryError);
  });
});
