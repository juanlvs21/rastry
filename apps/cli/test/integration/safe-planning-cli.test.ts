import { access, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

const repositoryRoot = resolve(import.meta.dir, "../../../..");
const fixture = resolve(repositoryRoot, "assets/test/landscape-mountains.jpg");

async function runCli(args: string[]): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
}> {
  const process = Bun.spawn(["bun", "run", "apps/cli/src/index.ts", ...args], {
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  return { exitCode, stderr, stdout };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("safe transformation planning CLI", () => {
  test("prints a human-readable dry-run summary", async () => {
    const result = await runCli(["photo.png", "--to", "webp"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Dry run: 1 file(s)");
    expect(result.stdout).toContain(`${resolve("photo-rastry.webp")}`);
    expect(result.stderr).toContain("Warning: Dry run:");
  });

  test("prints a machine-readable dry-run plan", async () => {
    const result = await runCli([
      "photo.png",
      "--to",
      "webp",
      "--quality",
      "82",
      "--dry-run",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);

    const plan = JSON.parse(result.stdout) as {
      dryRun: boolean;
      files: Array<{ input: string; output: string }>;
      pipeline: { operations: Array<{ type: string; format?: string; quality?: number }> };
    };

    expect(plan.dryRun).toBe(true);
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0]?.output).toEndWith(`${resolve("photo-rastry.webp")}`);
    expect(plan.pipeline.operations).toEqual([
      { type: "convert", format: "webp", quality: 82 },
      { type: "strip-metadata" },
    ]);
    expect(result.stderr).toBe("");
  });

  test("returns a non-zero exit code for an unsupported format", async () => {
    const result = await runCli(["photo.png", "--to", "gif"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("rastry: Unsupported format: gif.");
  });

  test("executes a transformation and prints a JSON summary", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-execute-"));
    const outputDirectory = join(temporaryRoot, "output");

    try {
      const result = await runCli([
        fixture,
        "--to",
        "webp",
        "--max-width",
        "400",
        "--output",
        outputDirectory,
        "--execute",
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const summary = JSON.parse(result.stdout) as {
        dryRun: boolean;
        processed: number;
        skipped: number;
        failed: number;
      };

      expect(summary).toEqual(
        expect.objectContaining({ dryRun: false, processed: 1, skipped: 0, failed: 0 }),
      );
      expect(await pathExists(join(outputDirectory, "landscape-mountains.webp"))).toBe(true);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("returns a non-zero exit code when an execution item fails", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-execute-failure-"));

    try {
      const result = await runCli([
        join(temporaryRoot, "missing.jpg"),
        "--to",
        "webp",
        "--output",
        join(temporaryRoot, "output"),
        "--execute",
        "--json",
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual(
        expect.objectContaining({ processed: 0, skipped: 0, failed: 1 }),
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("expands a folder in stable order, filters non-images, and excludes output", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-directory-plan-"));
    const inputDirectory = join(temporaryRoot, "inputs");
    const outputDirectory = join(inputDirectory, "optimized");
    const nestedDirectory = join(inputDirectory, "nested");

    try {
      await mkdir(nestedDirectory, { recursive: true });
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(join(inputDirectory, "z.jpg"), "not decoded during dry-run");
      await writeFile(join(inputDirectory, "notes.txt"), "ignored");
      await writeFile(join(nestedDirectory, "a.jpeg"), "not decoded during dry-run");
      await writeFile(join(outputDirectory, "old.jpg"), "excluded");

      const result = await runCli([
        inputDirectory,
        "--to",
        "webp",
        "--output",
        outputDirectory,
        "--dry-run",
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      const plan = JSON.parse(result.stdout) as {
        files: Array<{ input: string; output: string }>;
        warnings: string[];
      };
      expect(plan.files.map((file) => basename(file.input))).toEqual(["a.jpeg", "z.jpg"]);
      expect(plan.files.map((file) => basename(file.output))).toEqual(["a.webp", "z.webp"]);
      expect(plan.warnings).toContain(
        "Ignored 1 non-PNG/JPEG/WebP path(s) during directory expansion.",
      );
      expect(result.stdout).not.toContain("old.jpg");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("isolates an existing output conflict in a folder execution", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-directory-execute-"));
    const inputDirectory = join(temporaryRoot, "inputs");
    const nestedDirectory = join(inputDirectory, "nested");
    const outputDirectory = join(inputDirectory, "optimized");
    const existingOutput = join(outputDirectory, "z.webp");
    const sentinel = new Uint8Array([3, 1, 4, 1, 5]);

    try {
      await mkdir(nestedDirectory, { recursive: true });
      await mkdir(outputDirectory, { recursive: true });
      await copyFile(fixture, join(inputDirectory, "z.jpg"));
      await copyFile(fixture, join(nestedDirectory, "a.jpg"));
      await writeFile(existingOutput, sentinel);

      const result = await runCli([
        inputDirectory,
        "--to",
        "webp",
        "--output",
        outputDirectory,
        "--execute",
        "--json",
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual(
        expect.objectContaining({ total: 2, processed: 1, skipped: 0, failed: 1, cancelled: 0 }),
      );
      expect(await pathExists(join(outputDirectory, "a.webp"))).toBe(true);
      expect(new Uint8Array(await Bun.file(existingOutput).arrayBuffer())).toEqual(sentinel);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
