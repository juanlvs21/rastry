import { access, constants, lstat, readdir } from "node:fs/promises";

import type {
  PlanningDirectoryEntry,
  PlanningFileSystem,
  PlanningPathInfo,
  PlanningPathKind,
} from "@rastry/core";

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function pathKind(entry: { isFile(): boolean; isDirectory(): boolean }): PlanningPathKind {
  if (entry.isFile()) return "file";
  if (entry.isDirectory()) return "directory";
  return "other";
}

export const desktopPlanningFileSystem: PlanningFileSystem = {
  async inspect(path: string): Promise<PlanningPathInfo | undefined> {
    let entry: Awaited<ReturnType<typeof lstat>>;
    try {
      entry = await lstat(path);
    } catch (error) {
      if (readErrorCode(error) === "ENOENT") return undefined;
      throw error;
    }

    let readable = true;
    try {
      await access(path);
    } catch {
      readable = false;
    }

    let writable = true;
    try {
      await access(path, constants.W_OK);
    } catch {
      writable = false;
    }

    return { kind: pathKind(entry), readable, writable };
  },

  async readDirectory(path: string): Promise<readonly PlanningDirectoryEntry[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, kind: pathKind(entry) }));
  },
};
