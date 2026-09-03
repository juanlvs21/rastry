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

describe("CLI declarative presets", () => {
  test("loads each shipped preset and exposes its resolved pipeline", async () => {
    for (const preset of ["web", "ecommerce", "social"]) {
      const result = await runCli(["run", fixture, "--preset", preset, "--dry-run", "--json"]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const plan = JSON.parse(result.stdout) as {
        pipeline: { name?: string; operations: Array<{ type: string }> };
      };
      expect(plan.pipeline.name).toBe(preset);
      expect(plan.pipeline.operations.length).toBeGreaterThan(0);
    }
  });

  test("loads a custom JSON preset through the shared pipeline contract", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-preset-file-"));
    const presetPath = join(temporaryRoot, "marketing.json");

    try {
      await Bun.write(
        presetPath,
        JSON.stringify({
          $schema: "../../packages/contracts/schema/pipeline.schema.json",
          version: 1,
          name: "marketing",
          operations: [
            { type: "crop", width: 300, height: 200, anchor: "center" },
            { type: "convert", format: "webp", quality: 88 },
            { type: "strip-metadata" },
          ],
        }),
      );

      const result = await runCli(["run", fixture, "--preset", presetPath, "--dry-run", "--json"]);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(
        expect.objectContaining({
          pipeline: expect.objectContaining({
            name: "marketing",
            operations: [
              { type: "crop", width: 300, height: 200, anchor: "center" },
              { type: "convert", format: "webp", quality: 88 },
              { type: "strip-metadata" },
            ],
          }),
        }),
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("executes a preset while preserving the shared output safety rules", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-preset-execute-"));
    const outputDirectory = join(temporaryRoot, "output");

    try {
      const result = await runCli([
        "run",
        fixture,
        "--preset",
        "web",
        "--output",
        outputDirectory,
        "--execute",
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual(
        expect.objectContaining({ processed: 1, skipped: 0, failed: 0, cancelled: 0 }),
      );
      expect(await pathExists(join(outputDirectory, "landscape-mountains.webp"))).toBe(true);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("rejects malformed JSON before planning or writing", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-preset-invalid-json-"));
    const presetPath = join(temporaryRoot, "broken.json");

    try {
      await Bun.write(presetPath, "{ not valid json");
      const result = await runCli(["run", fixture, "--preset", presetPath, "--execute"]);

      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("INVALID_PRESET_JSON");
      expect(await pathExists(join(temporaryRoot, "output"))).toBe(false);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("rejects unsupported schema versions and conflicting shorthand flags", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "rastry-cli-preset-invalid-"));
    const presetPath = join(temporaryRoot, "future.json");

    try {
      await Bun.write(
        presetPath,
        JSON.stringify({ version: 2, operations: [{ type: "convert", format: "webp" }] }),
      );

      const unsupported = await runCli(["run", fixture, "--preset", presetPath]);
      expect(unsupported.exitCode).toBe(2);
      expect(unsupported.stderr).toContain("UNSUPPORTED_SCHEMA_VERSION");

      const conflicting = await runCli(["run", fixture, "--preset", "web", "--to", "png"]);
      expect(conflicting.exitCode).toBe(2);
      expect(conflicting.stderr).toContain("CONFLICTING_OPTIONS");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("rejects unknown preset names and preserves the shorthand command", async () => {
    const missing = await runCli(["run", fixture, "--preset", "unknown"]);

    expect(missing.exitCode).toBe(2);
    expect(missing.stderr).toContain("PRESET_NOT_FOUND");

    const shorthand = await runCli([fixture, "--to", "webp", "--dry-run", "--json"]);
    expect(shorthand.exitCode).toBe(0);
    expect(JSON.parse(shorthand.stdout)).toEqual(
      expect.objectContaining({
        pipeline: expect.objectContaining({
          operations: [{ type: "convert", format: "webp" }, { type: "strip-metadata" }],
        }),
      }),
    );
  });
});
