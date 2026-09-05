#!/usr/bin/env bun

import {
  isSupportedOutputFormat,
  type ImageFormat,
  type ExecutionSummary,
  type PipelineConfig,
  type PipelineOperation,
} from "@rastry/contracts";
import { createExecutionPlanFromInputs, RastryError } from "@rastry/core";
import { createImageEngine } from "@rastry/image-engine";

import { cliPlanningFileSystem } from "./filesystem";
import { loadPreset } from "./presets";

const VERSION = "0.0.0";

const help = `Rastry ${VERSION}

Create a safe, local image transformation plan.

Usage:
  rastry <input...> --to <png|jpeg|webp> [options]
  rastry run <input...> --preset <name|path> [options]

Options:
  --to <format>        Output format (required)
  --quality <1-100>    JPEG/WebP quality
  --max-width <px>     Proportional maximum width
  --max-height <px>    Proportional maximum height
  --output <directory> Output directory (default: beside input as {name}-rastry.{format})
  --preset <name|path> Built-in preset name or local JSON file (use with run)
  --dry-run            Print the plan without writing files (default)
  --execute            Process files and write new outputs safely
  --json               Print machine-readable JSON
  --help                Show this help
  --version             Show the version

Examples:
  rastry photo.png --to webp --quality 82 --dry-run
  rastry hero.png card.jpg --to webp --max-width 1600 --output ./optimized
  rastry run ./public --preset web
  rastry run ./public --preset ./presets/marketing.json --execute
`;

type CliCommand = "shorthand" | "preset";

type CliOptions = {
  inputs: string[];
  format?: ImageFormat;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  output?: string;
  preset?: string;
  command: CliCommand;
  json: boolean;
  dryRun: boolean;
};

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new RastryError("MISSING_OPTION_VALUE", `${flag} requires a value.`);
  }
  return value;
}

function parseInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new RastryError("INVALID_OPTION", `${flag} must be an integer.`);
  }
  return parsed;
}

function parseArgs(args: string[]): CliOptions {
  const command: CliCommand = args[0] === "run" ? "preset" : "shorthand";
  const startIndex = command === "preset" ? 1 : 0;
  const options: CliOptions = { inputs: [], json: false, dryRun: true, command };

  for (let index = startIndex; index < args.length; index += 1) {
    const argument = args[index]!;

    if (!argument.startsWith("--")) {
      options.inputs.push(argument);
      continue;
    }

    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--execute") {
      options.dryRun = false;
      continue;
    }
    if (argument === "--json") {
      options.json = true;
      continue;
    }

    const value = readValue(args, index, argument);
    index += 1;

    if (argument === "--to") {
      if (!isSupportedOutputFormat(value)) {
        throw new RastryError("INVALID_OPTION", `Unsupported format: ${value}.`);
      }
      options.format = value;
    } else if (argument === "--quality") {
      options.quality = parseInteger(value, argument);
    } else if (argument === "--max-width") {
      options.maxWidth = parseInteger(value, argument);
    } else if (argument === "--max-height") {
      options.maxHeight = parseInteger(value, argument);
    } else if (argument === "--output") {
      options.output = value;
    } else if (argument === "--preset") {
      if (options.command !== "preset") {
        throw new RastryError("PRESET_REQUIRES_RUN", "--preset requires the run command.");
      }
      options.preset = value;
    } else {
      throw new RastryError("UNKNOWN_OPTION", `Unknown option: ${argument}.`);
    }
  }

  if (options.command === "preset") {
    if (options.preset === undefined) {
      throw new RastryError("MISSING_PRESET", "--preset is required with the run command.");
    }
    if (
      options.format !== undefined ||
      options.quality !== undefined ||
      options.maxWidth !== undefined ||
      options.maxHeight !== undefined
    ) {
      throw new RastryError(
        "CONFLICTING_OPTIONS",
        "Preset runs cannot be combined with --to, --quality, --max-width, or --max-height.",
      );
    }
  }

  return options;
}

function printExecutionSummary(summary: ExecutionSummary): void {
  console.log(
    `Processed: ${summary.processed} · Skipped: ${summary.skipped} · Failed: ${summary.failed} · Cancelled: ${summary.cancelled}`,
  );
  console.log(`Bytes: ${summary.bytesBefore} -> ${summary.bytesAfter}`);

  for (const file of summary.files) {
    if (file.status === "processed") {
      console.log(`  ${file.input} -> ${file.output}`);
      continue;
    }
    if (file.status === "failed") {
      console.error(
        `  ${file.input} -> ${file.output}: ${file.error?.code} ${file.error?.message}`,
      );
    }
  }
}

async function run(args: string[]): Promise<void> {
  if (args.includes("--help") || args.length === 0) {
    console.log(help);
    return;
  }
  if (args.includes("--version")) {
    console.log(VERSION);
    return;
  }

  const options = parseArgs(args);

  let pipeline: PipelineConfig;
  if (options.command === "preset") {
    pipeline = await loadPreset(options.preset!);
  } else {
    if (options.format === undefined) {
      throw new RastryError("MISSING_FORMAT", "--to is required for planning.");
    }

    const operations: PipelineOperation[] = [];
    if (options.maxWidth !== undefined || options.maxHeight !== undefined) {
      operations.push({
        type: "resize",
        ...(options.maxWidth === undefined ? {} : { width: options.maxWidth }),
        ...(options.maxHeight === undefined ? {} : { height: options.maxHeight }),
        fit: "contain",
      });
    }
    operations.push({
      type: "convert",
      format: options.format,
      ...(options.quality === undefined ? {} : { quality: options.quality }),
    });
    operations.push({ type: "strip-metadata" });
    pipeline = { version: 1, operations };
  }

  const plan = await createExecutionPlanFromInputs(
    {
      inputs: options.inputs,
      ...(options.output === undefined ? {} : { outputDirectory: options.output }),
      pipeline,
      dryRun: options.dryRun,
    },
    cliPlanningFileSystem,
  );

  if (plan.dryRun && options.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (plan.dryRun) {
    console.log(`Dry run: ${plan.files.length} file(s)`);
    for (const file of plan.files) {
      const suffix =
        file.preflightError === undefined
          ? ""
          : ` [${file.preflightError.code}] ${file.preflightError.message}`;
      console.log(`  ${file.input} -> ${file.output}${suffix}`);
    }
    for (const warning of plan.warnings) console.warn(`Warning: ${warning}`);
    return;
  }

  const summary = await createImageEngine().execute(plan);
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printExecutionSummary(summary);
  }
  if (summary.failed > 0) process.exitCode = 1;
}

void run(Bun.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof RastryError) {
    console.error(`rastry: ${error.message} [${error.code}]`);
    process.exitCode = 2;
  } else {
    throw error;
  }
});
