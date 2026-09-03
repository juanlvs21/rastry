import { extname, join, resolve } from "node:path";

import { isSupportedInputFormat, type ExecutionError } from "@rastry/contracts";

import { RastryError } from "./errors";
import { isPathWithin, comparePaths, pathComparisonKey } from "./paths";

export type PlanningPathKind = "file" | "directory" | "other";

export type PlanningPathInfo = {
  kind: PlanningPathKind;
  readable: boolean;
  writable: boolean;
};

export type PlanningDirectoryEntry = {
  name: string;
  kind: PlanningPathKind;
};

export type PlanningFileSystem = {
  inspect(path: string): Promise<PlanningPathInfo | undefined>;
  readDirectory(path: string): Promise<readonly PlanningDirectoryEntry[]>;
};

export type DiscoveredInputs = {
  inputs: string[];
  preflightErrors: Map<string, ExecutionError>;
  warnings: string[];
};

const SUPPORTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function isSupportedPath(path: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(path).toLowerCase());
}

function pathError(code: string, message: string): ExecutionError {
  return { code, message };
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

function mapInspectError(error: unknown, path: string): ExecutionError {
  const code = readErrorCode(error);
  if (code === "ENOENT") {
    return pathError("INPUT_NOT_FOUND", `The input path could not be found: ${path}`);
  }
  if (code === "EACCES" || code === "EPERM") {
    return pathError("INPUT_NOT_READABLE", `The input path could not be read: ${path}`);
  }
  return pathError(
    "INPUT_PREFLIGHT_FAILED",
    `The input path could not be inspected: ${path}: ${readErrorMessage(error)}`,
  );
}

async function inspect(
  fileSystem: PlanningFileSystem,
  path: string,
): Promise<{ info: PlanningPathInfo | undefined; error: ExecutionError | undefined }> {
  try {
    const info = await fileSystem.inspect(path);
    return { info, error: undefined };
  } catch (error) {
    return { info: undefined, error: mapInspectError(error, path) };
  }
}

async function addExplicitInput(
  path: string,
  fileSystem: PlanningFileSystem,
  inputs: string[],
  preflightErrors: Map<string, ExecutionError>,
): Promise<void> {
  const resolvedPath = resolve(path);
  const inspection = await inspect(fileSystem, resolvedPath);
  inputs.push(resolvedPath);

  if (inspection.error !== undefined) {
    preflightErrors.set(resolvedPath, inspection.error);
    return;
  }
  if (inspection.info === undefined) {
    preflightErrors.set(
      resolvedPath,
      pathError("INPUT_NOT_FOUND", `The input path could not be found: ${resolvedPath}`),
    );
    return;
  }
  if (inspection.info.kind !== "file") {
    preflightErrors.set(
      resolvedPath,
      pathError("INPUT_NOT_FILE", `The input path is not a regular file: ${resolvedPath}`),
    );
    return;
  }
  if (!inspection.info.readable) {
    preflightErrors.set(
      resolvedPath,
      pathError("INPUT_NOT_READABLE", `The input file could not be read: ${resolvedPath}`),
    );
    return;
  }
  if (
    !isSupportedInputFormat(
      extname(resolvedPath).replace(/^\./, "").toLowerCase().replace("jpg", "jpeg"),
    )
  ) {
    preflightErrors.set(
      resolvedPath,
      pathError(
        "UNSUPPORTED_INPUT_FORMAT",
        `The input file extension is not supported: ${resolvedPath}. Expected PNG, JPEG, or WebP.`,
      ),
    );
  }
}

async function expandDirectory(
  directory: string,
  outputDirectory: string,
  fileSystem: PlanningFileSystem,
  inputs: string[],
  preflightErrors: Map<string, ExecutionError>,
  ignoredPaths: string[],
): Promise<void> {
  if (isPathWithin(outputDirectory, directory)) {
    return;
  }

  let entries: readonly PlanningDirectoryEntry[];
  try {
    entries = await fileSystem.readDirectory(directory);
  } catch (error) {
    const code = readErrorCode(error);
    const errorCode =
      code === "EACCES" || code === "EPERM" ? "INPUT_NOT_READABLE" : "INPUT_DISCOVERY_FAILED";
    throw new RastryError(
      errorCode,
      `The input directory could not be read: ${directory}: ${readErrorMessage(error)}`,
    );
  }

  const sortedEntries: PlanningDirectoryEntry[] = [];
  for (const entry of entries) {
    const insertionIndex = sortedEntries.findIndex(
      (current) => comparePaths(join(directory, entry.name), join(directory, current.name)) < 0,
    );
    if (insertionIndex === -1) {
      sortedEntries.push(entry);
    } else {
      sortedEntries.splice(insertionIndex, 0, entry);
    }
  }

  for (const entry of sortedEntries) {
    const child = resolve(directory, entry.name);
    if (isPathWithin(outputDirectory, child)) {
      continue;
    }
    if (entry.kind === "directory") {
      await expandDirectory(
        child,
        outputDirectory,
        fileSystem,
        inputs,
        preflightErrors,
        ignoredPaths,
      );
      continue;
    }
    if (entry.kind !== "file" || !isSupportedPath(child)) {
      ignoredPaths.push(child);
      continue;
    }

    const inspection = await inspect(fileSystem, child);
    inputs.push(child);
    if (inspection.error !== undefined) {
      preflightErrors.set(child, inspection.error);
    } else if (inspection.info === undefined) {
      preflightErrors.set(
        child,
        pathError("INPUT_NOT_FOUND", `The input path could not be found: ${child}`),
      );
    } else if (inspection.info.kind !== "file") {
      preflightErrors.set(
        child,
        pathError("INPUT_NOT_FILE", `The input path is not a regular file: ${child}`),
      );
    } else if (!inspection.info.readable) {
      preflightErrors.set(
        child,
        pathError("INPUT_NOT_READABLE", `The input file could not be read: ${child}`),
      );
    }
  }
}

export async function discoverInputs(
  inputs: readonly string[],
  outputDirectory: string,
  fileSystem: PlanningFileSystem,
): Promise<DiscoveredInputs> {
  const discovered: string[] = [];
  const preflightErrors = new Map<string, ExecutionError>();
  const ignoredPaths: string[] = [];
  let discoveredFromDirectory = false;

  for (const input of inputs) {
    const resolvedInput = resolve(input);
    const inspection = await inspect(fileSystem, resolvedInput);

    if (inspection.error !== undefined) {
      await addExplicitInput(resolvedInput, fileSystem, discovered, preflightErrors);
      continue;
    }
    if (inspection.info === undefined) {
      await addExplicitInput(resolvedInput, fileSystem, discovered, preflightErrors);
      continue;
    }
    if (inspection.info.kind === "directory") {
      if (isPathWithin(outputDirectory, resolvedInput)) {
        throw new RastryError(
          "OUTPUT_DIRECTORY_EQUALS_INPUT",
          `The output directory cannot also be an input directory: ${resolvedInput}`,
        );
      }
      if (!inspection.info.readable) {
        throw new RastryError(
          "INPUT_NOT_READABLE",
          `The input directory could not be read: ${resolvedInput}`,
        );
      }
      discoveredFromDirectory = true;
      await expandDirectory(
        resolvedInput,
        outputDirectory,
        fileSystem,
        discovered,
        preflightErrors,
        ignoredPaths,
      );
      continue;
    }
    await addExplicitInput(resolvedInput, fileSystem, discovered, preflightErrors);
  }

  if (discovered.length === 0 && discoveredFromDirectory) {
    throw new RastryError(
      "NO_SUPPORTED_INPUTS",
      "No PNG, JPEG, or WebP files were found in the input directories.",
    );
  }

  const duplicate = new Set<string>();
  for (const input of discovered) {
    const key = pathComparisonKey(input);
    if (duplicate.has(key)) {
      throw new RastryError(
        "INPUT_DUPLICATE",
        `The input file was discovered more than once: ${input}`,
      );
    }
    duplicate.add(key);
  }

  const warnings =
    ignoredPaths.length === 0
      ? []
      : [`Ignored ${ignoredPaths.length} non-PNG/JPEG/WebP path(s) during directory expansion.`];
  return { inputs: discovered, preflightErrors, warnings };
}
