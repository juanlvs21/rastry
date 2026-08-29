#!/usr/bin/env bun

import {
  isSupportedOutputFormat,
  type ImageFormat,
  type PipelineOperation,
} from "@rastry/contracts";
import { createExecutionPlan, RastryError } from "@rastry/core";

const VERSION = "0.0.0";

const help = `Rastry ${VERSION}

Create a safe, local image transformation plan.

Usage:
  rastry <input...> --to <png|jpeg|webp> [options]

Options:
  --to <format>        Output format (required for planning)
  --quality <1-100>    JPEG/WebP quality
  --max-width <px>     Proportional maximum width
  --max-height <px>    Proportional maximum height
  --output <directory> Output directory (default: ./rastry-output beside input)
  --dry-run            Print the plan without writing files (default)
  --json               Print machine-readable JSON
  --help                Show this help
  --version             Show the version

Examples:
  rastry photo.png --to webp --quality 82 --dry-run
  rastry hero.png card.jpg --to webp --max-width 1600 --output ./optimized
`;

type CliOptions = {
  inputs: string[];
  format?: ImageFormat;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  output?: string;
  json: boolean;
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
  const options: CliOptions = { inputs: [], json: false };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;

    if (!argument.startsWith("--")) {
      options.inputs.push(argument);
      continue;
    }

    if (argument === "--dry-run") continue;
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
    } else {
      throw new RastryError("UNKNOWN_OPTION", `Unknown option: ${argument}.`);
    }
  }

  return options;
}

function run(args: string[]): void {
  if (args.includes("--help") || args.length === 0) {
    console.log(help);
    return;
  }
  if (args.includes("--version")) {
    console.log(VERSION);
    return;
  }

  const options = parseArgs(args);
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

  const plan = createExecutionPlan({
    inputs: options.inputs,
    ...(options.output === undefined ? {} : { outputDirectory: options.output }),
    pipeline: { version: 1, operations },
  });

  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  console.log(`Dry run: ${plan.files.length} file(s)`);
  for (const file of plan.files) console.log(`  ${file.input} -> ${file.output}`);
  for (const warning of plan.warnings) console.warn(`Warning: ${warning}`);
}

try {
  run(Bun.argv.slice(2));
} catch (error) {
  if (error instanceof RastryError) {
    console.error(`rastry: ${error.message}`);
    process.exitCode = 2;
  } else {
    throw error;
  }
}
