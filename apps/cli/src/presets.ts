import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import { validatePipeline, RastryError } from "@rastry/core";
import type { PipelineConfig } from "@rastry/contracts";

import ecommercePreset from "../../../examples/presets/ecommerce.json";
import socialPreset from "../../../examples/presets/social.json";
import webPreset from "../../../examples/presets/web.json";

const builtInPresets: Readonly<Record<string, unknown>> = {
  ecommerce: ecommercePreset,
  social: socialPreset,
  web: webPreset,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : String(error);
}

function normalizePresetDocument(value: unknown, source: string): unknown {
  if (!isRecord(value) || !("$schema" in value)) {
    return value;
  }

  if (typeof value.$schema !== "string" || value.$schema.length === 0) {
    throw new RastryError("INVALID_PRESET", `Preset ${source} has an invalid $schema field.`);
  }

  const { $schema: _schema, ...pipeline } = value;
  return pipeline;
}

function validatePresetDocument(value: unknown, source: string): PipelineConfig {
  const pipeline = normalizePresetDocument(value, source);

  try {
    validatePipeline(pipeline as PipelineConfig);
  } catch (error) {
    if (error instanceof RastryError) {
      if (error.code === "UNSUPPORTED_SCHEMA_VERSION") {
        throw new RastryError(error.code, `Preset ${source} is not supported: ${error.message}`);
      }
      throw new RastryError("INVALID_PRESET", `Preset ${source} is invalid: ${error.message}`);
    }
    throw new RastryError("INVALID_PRESET", `Preset ${source} is invalid.`);
  }

  return pipeline as PipelineConfig;
}

function isExplicitFileReference(reference: string): boolean {
  return (
    isAbsolute(reference) ||
    reference.endsWith(".json") ||
    reference.includes("/") ||
    reference.includes("\\")
  );
}

async function loadPresetFile(path: string, reference: string): Promise<PipelineConfig> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    const code = readErrorCode(error);
    if (code === "ENOENT") {
      throw new RastryError("PRESET_NOT_FOUND", `Preset file not found: ${reference}.`);
    }
    if (code === "EACCES" || code === "EPERM") {
      throw new RastryError("PRESET_READ_FAILED", `Preset file could not be read: ${reference}.`);
    }
    throw new RastryError(
      "PRESET_READ_FAILED",
      `Preset file could not be read: ${reference}: ${readErrorMessage(error)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents) as unknown;
  } catch (error) {
    throw new RastryError(
      "INVALID_PRESET_JSON",
      `Preset file is not valid JSON: ${reference}: ${readErrorMessage(error)}`,
    );
  }

  return validatePresetDocument(parsed, reference);
}

export async function loadPreset(reference: string): Promise<PipelineConfig> {
  const normalizedReference = reference.trim();
  if (normalizedReference.length === 0) {
    throw new RastryError("MISSING_PRESET", "--preset requires a name or JSON file path.");
  }

  const builtIn = builtInPresets[normalizedReference];
  if (builtIn !== undefined) {
    return validatePresetDocument(builtIn, `built-in preset "${normalizedReference}"`);
  }

  if (!isExplicitFileReference(normalizedReference)) {
    throw new RastryError(
      "PRESET_NOT_FOUND",
      `Unknown preset: ${normalizedReference}. Use web, ecommerce, social, or a JSON file path.`,
    );
  }

  return loadPresetFile(resolve(normalizedReference), normalizedReference);
}
