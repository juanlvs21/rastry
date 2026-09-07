import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
const webReleasesDirectory = resolve(repositoryRoot, "apps/web/src/content/releases");
const recordSeparator = "\u001e";
const fieldSeparator = "\u001f";
const categoryOrder = [
  "Features",
  "Fixes",
  "Performance",
  "Documentation",
  "Refactoring",
  "Tests",
  "Maintenance",
  "Other",
] as const;

type Category = (typeof categoryOrder)[number];
type ReleaseOptions = { version: string; from?: string; to: string; date: string; write: boolean };
type ConventionalCommit = {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  breaking: boolean;
};

class ReleaseUsageError extends Error {}

const categoryByType: Record<string, Category> = {
  build: "Maintenance",
  chore: "Maintenance",
  ci: "Maintenance",
  docs: "Documentation",
  feat: "Features",
  fix: "Fixes",
  perf: "Performance",
  refactor: "Refactoring",
  revert: "Maintenance",
  test: "Tests",
};

function optionValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--"))
    throw new ReleaseUsageError(option + " requires a value.");
  return value;
}

function parseVersion(value: string): string {
  const version = value.startsWith("v") ? value.slice(1) : value;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new ReleaseUsageError(
      "Expected a semantic version such as 0.0.2, received " + value + ".",
    );
  }
  return version;
}

function parseOptions(args: readonly string[]): ReleaseOptions {
  const rawVersion = args[0];
  if (rawVersion === undefined || rawVersion.startsWith("--")) {
    throw new ReleaseUsageError("A release version is required as the first argument.");
  }

  const options: ReleaseOptions = {
    version: parseVersion(rawVersion),
    to: "HEAD",
    date: new Date().toISOString().slice(0, 10),
    write: false,
  };

  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--write") {
      options.write = true;
      continue;
    }
    if (argument === "--from") {
      options.from = optionValue(args, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--to") {
      options.to = optionValue(args, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--date") {
      const date = optionValue(args, index, argument);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new ReleaseUsageError("--date must use YYYY-MM-DD.");
      options.date = date;
      index += 1;
      continue;
    }
    throw new ReleaseUsageError("Unknown option: " + argument + ".");
  }

  return options;
}

function readText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function runGit(args: readonly string[]): string {
  const result = Bun.spawnSync(["git", ...args], {
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      readText(result.stderr).trim() || "Git could not read the requested release range.",
    );
  }
  return readText(result.stdout);
}

function readCommits(options: ReleaseOptions): ConventionalCommit[] {
  const range = options.from === undefined ? options.to : options.from + ".." + options.to;
  const log = runGit(["log", "--no-merges", "--format=%H%x1f%s%x1e", range]);
  const commits: ConventionalCommit[] = [];

  for (const record of log.split(recordSeparator)) {
    const fields = record.trim().split(fieldSeparator);
    const hash = fields[0];
    const subject = fields[1];
    if (hash === undefined || subject === undefined || subject.length === 0) continue;
    const match = subject.match(/^([a-z]+)(?:\(([^()\r\n]+)\))?(!)?: (.+)$/);
    if (match === null) continue;
    commits.push({
      hash,
      type: match[1]!,
      ...(match[2] === undefined ? {} : { scope: match[2] }),
      subject: match[4]!,
      breaking: match[3] === "!",
    });
  }
  return commits;
}

function categoryFor(commit: ConventionalCommit): Category {
  return categoryByType[commit.type] ?? "Other";
}

function escapeMarkdown(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(String.fromCharCode(96), String.fromCharCode(92, 96))
    .replaceAll("\n", " ");
}

function formatCommit(commit: ConventionalCommit): string {
  const label = commit.scope === undefined ? commit.type : commit.type + "(" + commit.scope + ")";
  const breaking = commit.breaking ? " **(BREAKING)**" : "";
  const tick = String.fromCharCode(96);
  return (
    "- " +
    tick +
    escapeMarkdown(label) +
    tick +
    ": " +
    escapeMarkdown(commit.subject) +
    " ([" +
    commit.hash.slice(0, 7) +
    "])" +
    breaking
  );
}

function renderCommitGroups(commits: readonly ConventionalCommit[]): string {
  const lines: string[] = [];
  for (const category of categoryOrder) {
    const categoryCommits = commits.filter((commit) => categoryFor(commit) === category);
    if (categoryCommits.length === 0) continue;
    lines.push("### " + category, "", ...categoryCommits.map(formatCommit), "");
  }
  if (lines.length === 0) lines.push("No changes recorded in this range.", "");
  return lines.join("\n").trimEnd();
}

function renderReleaseSection(
  version: string,
  date: string,
  commits: readonly ConventionalCommit[],
): string {
  return "## [" + version + "] - " + date + "\n\n" + renderCommitGroups(commits);
}

function updateChangelog(
  existing: string,
  version: string,
  date: string,
  commits: readonly ConventionalCommit[],
): string {
  const releaseHeading = "## [" + version + "] - " + date;
  if (existing.includes(releaseHeading)) return existing;

  const marker = "## [Unreleased]";
  const start = existing.indexOf(marker);
  const release = renderReleaseSection(version, date, commits);
  const unreleased = "## [Unreleased]\n\nNo changes recorded after the " + version + " release.";
  if (start === -1) return unreleased + "\n\n" + release + "\n\n" + existing.trimStart();

  const nextHeading = existing.indexOf("\n## ", start + marker.length);
  const end = nextHeading === -1 ? existing.length : nextHeading + 1;
  return (
    existing.slice(0, start) +
    unreleased +
    "\n\n" +
    release +
    "\n\n" +
    existing.slice(end).trimStart()
  );
}

function renderWebEntry(
  version: string,
  date: string,
  commits: readonly ConventionalCommit[],
): string {
  const downloadBase = "https://github.com/juanlvs21/rastry/releases/latest/download";
  return [
    "---",
    "title: Rastry " + version,
    "description: Cross-platform Rastry CLI binaries and Desktop installers.",
    "version: " + version,
    'date: "' + date + '"',
    "category: release",
    "sourcePath: CHANGELOG.md",
    "---",
    "",
    "Rastry " +
      version +
      " is available as standalone binaries and native Desktop installers. No Bun installation is required for end users.",
    "",
    "## Downloads",
    "",
    "- [CLI for Windows](<" + downloadBase + "/rastry-windows-x64-cli.zip>)",
    "- [CLI for macOS](<" + downloadBase + "/rastry-macos-cli.tar.gz>)",
    "- [CLI for Linux](<" + downloadBase + "/rastry-linux-x64-cli.tar.gz>)",
    "- [Desktop for Windows](<" + downloadBase + "/rastry-windows-x64-desktop-setup.exe>)",
    "- [Desktop for macOS](<" + downloadBase + "/rastry-macos-desktop.dmg>)",
    "- [Desktop for Linux (.deb)](<" + downloadBase + "/rastry-linux-x64-desktop.deb>)",
    "",
    "## Changes",
    "",
    renderCommitGroups(commits),
    "",
    "Read the [full changelog](https://github.com/juanlvs21/rastry/blob/main/CHANGELOG.md) and [release assets](https://github.com/juanlvs21/rastry/releases/tag/v" +
      version +
      ").",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const options = parseOptions(Bun.argv.slice(2));
  const commits = readCommits(options);
  const changelog = await readFile(resolve(repositoryRoot, "CHANGELOG.md"), "utf8").catch(
    () => "# Changelog\n\n",
  );
  const updatedChangelog = updateChangelog(changelog, options.version, options.date, commits);
  const webReleasePath = resolve(webReleasesDirectory, options.version + ".md");
  const webEntry = renderWebEntry(options.version, options.date, commits);

  if (!options.write) {
    process.stdout.write(updatedChangelog);
    return;
  }

  await writeFile(resolve(repositoryRoot, "CHANGELOG.md"), updatedChangelog, "utf8");
  try {
    await readFile(webReleasePath, "utf8");
  } catch {
    await writeFile(webReleasePath, webEntry, "utf8");
  }
  process.stderr.write(
    "Prepared release " + options.version + " in CHANGELOG.md and " + webReleasePath + "\n",
  );
}

void main().catch((error: unknown) => {
  if (error instanceof ReleaseUsageError) {
    console.error("release: " + error.message);
    process.exitCode = 2;
    return;
  }
  console.error("release: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
