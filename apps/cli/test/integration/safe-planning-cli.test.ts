import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
    expect(result.stdout).toContain(`${resolve("rastry-output", "photo.webp")}`);
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
    expect(plan.files[0]?.output).toEndWith(`${resolve("rastry-output", "photo.webp")}`);
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
});
