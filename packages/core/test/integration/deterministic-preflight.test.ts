import { basename, join, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

import type { PlanningDirectoryEntry, PlanningFileSystem, PlanningPathInfo } from "@rastry/core";
import { createExecutionPlanFromInputs, RastryError } from "@rastry/core";
import type { PipelineConfig } from "@rastry/contracts";

const pipeline: PipelineConfig = {
  version: 1,
  operations: [{ type: "convert", format: "webp" }],
};

class FakeFileSystem implements PlanningFileSystem {
  readonly inspections: string[] = [];
  readonly directoryReads: string[] = [];
  private readonly paths = new Map<string, PlanningPathInfo>();
  private readonly directories = new Map<string, readonly PlanningDirectoryEntry[]>();

  addPath(path: string, info: PlanningPathInfo): this {
    this.paths.set(resolve(path), info);
    return this;
  }

  addDirectory(path: string, entries: readonly PlanningDirectoryEntry[]): this {
    const resolved = resolve(path);
    this.paths.set(resolved, { kind: "directory", readable: true, writable: true });
    this.directories.set(resolved, entries);
    return this;
  }

  async inspect(path: string): Promise<PlanningPathInfo | undefined> {
    const resolved = resolve(path);
    this.inspections.push(resolved);
    return this.paths.get(resolved);
  }

  async readDirectory(path: string): Promise<readonly PlanningDirectoryEntry[]> {
    const resolved = resolve(path);
    this.directoryReads.push(resolved);
    return this.directories.get(resolved) ?? [];
  }
}

async function expectRastryError(code: string, action: () => Promise<unknown>): Promise<void> {
  let thrown: unknown;
  try {
    await action();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(RastryError);
  expect((thrown as RastryError).code).toBe(code);
}

describe("deterministic input preflight", () => {
  test("expands folders recursively, filters formats, orders files, and excludes output", async () => {
    const inputDirectory = resolve("preflight-input");
    const nestedDirectory = join(inputDirectory, "nested");
    const outputDirectory = join(inputDirectory, "rastry-output");
    const fileSystem = new FakeFileSystem()
      .addDirectory(inputDirectory, [
        { name: "z.JPG", kind: "file" },
        { name: "notes.txt", kind: "file" },
        { name: "rastry-output", kind: "directory" },
        { name: "nested", kind: "directory" },
      ])
      .addDirectory(nestedDirectory, [{ name: "a.jpeg", kind: "file" }])
      .addDirectory(outputDirectory, [{ name: "old.png", kind: "file" }])
      .addPath(join(inputDirectory, "z.JPG"), { kind: "file", readable: true, writable: true })
      .addPath(join(inputDirectory, "notes.txt"), { kind: "file", readable: true, writable: true })
      .addPath(join(nestedDirectory, "a.jpeg"), { kind: "file", readable: true, writable: true });

    const plan = await createExecutionPlanFromInputs(
      { inputs: [inputDirectory], outputDirectory, pipeline },
      fileSystem,
    );

    expect(plan.files.map((file) => basename(file.input))).toEqual(["a.jpeg", "z.JPG"]);
    expect(plan.files.map((file) => basename(file.output))).toEqual(["a.webp", "z.webp"]);
    expect(fileSystem.directoryReads).toEqual([inputDirectory, nestedDirectory]);
    expect(plan.warnings).toContain(
      "Ignored 1 non-PNG/JPEG/WebP path(s) during directory expansion.",
    );
    expect(plan.files.some((file) => file.input.includes("old.png"))).toBe(false);
  });

  test("reports existing outputs on the affected planned file without mutating", async () => {
    const input = resolve("input/photo.png");
    const outputDirectory = resolve("output");
    const output = join(outputDirectory, "photo.webp");
    const fileSystem = new FakeFileSystem()
      .addPath(input, { kind: "file", readable: true, writable: true })
      .addDirectory(outputDirectory, [])
      .addPath(output, { kind: "file", readable: true, writable: true });

    const plan = await createExecutionPlanFromInputs(
      { inputs: [input], outputDirectory, pipeline },
      fileSystem,
    );

    expect(plan.files[0]?.preflightError).toEqual({
      code: "OUTPUT_EXISTS",
      message: `Refusing to overwrite existing output: ${output}`,
    });
    expect(fileSystem.directoryReads).toEqual([]);
  });

  test("rejects an output path that is not a directory", async () => {
    const input = resolve("input/photo.png");
    const outputDirectory = resolve("output-file");
    const fileSystem = new FakeFileSystem()
      .addPath(input, { kind: "file", readable: true, writable: true })
      .addPath(outputDirectory, { kind: "file", readable: true, writable: true });

    await expectRastryError("INVALID_OUTPUT_DIRECTORY", () =>
      createExecutionPlanFromInputs({ inputs: [input], outputDirectory, pipeline }, fileSystem),
    );
  });

  test("rejects an existing output directory that is not writable", async () => {
    const input = resolve("input/photo.png");
    const outputDirectory = resolve("read-only-output");
    const fileSystem = new FakeFileSystem()
      .addPath(input, { kind: "file", readable: true, writable: true })
      .addPath(outputDirectory, { kind: "directory", readable: true, writable: false });

    await expectRastryError("OUTPUT_NOT_WRITABLE", () =>
      createExecutionPlanFromInputs({ inputs: [input], outputDirectory, pipeline }, fileSystem),
    );
  });

  test("rejects empty directories and duplicate discoveries", async () => {
    const emptyDirectory = resolve("empty-input");
    const emptyFileSystem = new FakeFileSystem().addDirectory(emptyDirectory, [
      { name: "README.md", kind: "file" },
    ]);

    await expectRastryError("NO_SUPPORTED_INPUTS", () =>
      createExecutionPlanFromInputs(
        { inputs: [emptyDirectory], outputDirectory: resolve("output"), pipeline },
        emptyFileSystem,
      ),
    );

    const inputDirectory = resolve("duplicate-input");
    const input = join(inputDirectory, "photo.png");
    const duplicateFileSystem = new FakeFileSystem()
      .addDirectory(inputDirectory, [{ name: "photo.png", kind: "file" }])
      .addPath(input, { kind: "file", readable: true, writable: true });

    await expectRastryError("INPUT_DUPLICATE", () =>
      createExecutionPlanFromInputs(
        { inputs: [inputDirectory, input], outputDirectory: resolve("output"), pipeline },
        duplicateFileSystem,
      ),
    );
  });
});
