import { normalize, sep } from "node:path";

export function pathComparisonKey(path: string): string {
  const normalized = normalize(path);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function comparePaths(left: string, right: string): number {
  const leftKey = pathComparisonKey(left);
  const rightKey = pathComparisonKey(right);
  if (leftKey < rightKey) return -1;
  if (leftKey > rightKey) return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isPathWithin(directory: string, candidate: string): boolean {
  const directoryKey = pathComparisonKey(directory);
  const candidateKey = pathComparisonKey(candidate);
  return (
    candidateKey === directoryKey ||
    candidateKey.startsWith(directoryKey.endsWith(sep) ? directoryKey : `${directoryKey}${sep}`)
  );
}
