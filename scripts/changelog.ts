import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
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

type ChangelogOptions = {
  from?: string;
  to: string;
  output?: string;
  write: boolean;
};

type ConventionalCommit = {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  breaking: boolean;
};

class ChangelogUsageError extends Error {}

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
  if (value === undefined || value.startsWith("--")) {
    throw new ChangelogUsageError(`${option} requires a value.`);
  }
  return value;
}

function parseOptions(args: readonly string[]): ChangelogOptions {
  const options: ChangelogOptions = { to: "HEAD", write: false };

  for (let index = 0; index < args.length; index += 1) {
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
    if (argument === "--output") {
      options.output = optionValue(args, index, argument);
      options.write = true;
      index += 1;
      continue;
    }

    throw new ChangelogUsageError(`Unknown option: ${argument}.`);
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
    const details = readText(result.stderr).trim();
    throw new Error(details || "Git could not read the requested commit range.");
  }

  return readText(result.stdout);
}

function readCommits(options: ChangelogOptions): ConventionalCommit[] {
  const range = options.from === undefined ? options.to : `${options.from}..${options.to}`;
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
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("\n", " ");
}

function formatCommit(commit: ConventionalCommit): string {
  const label = commit.scope === undefined ? commit.type : `${commit.type}(${commit.scope})`;
  const breaking = commit.breaking ? " **(BREAKING)**" : "";
  return `- \`${escapeMarkdown(label)}\`: ${escapeMarkdown(commit.subject)} ([${commit.hash.slice(0, 7)}])${breaking}`;
}

function renderUnreleasedSection(commits: readonly ConventionalCommit[]): string {
  const lines = ["## [Unreleased]", ""];

  if (commits.length === 0) {
    lines.push("No changes recorded in this range.");
    return `${lines.join("\n").trimEnd()}\n`;
  }

  for (const category of categoryOrder) {
    const categoryCommits = commits.filter((commit) => categoryFor(commit) === category);
    if (categoryCommits.length === 0) continue;
    lines.push(`### ${category}`, "", ...categoryCommits.map(formatCommit), "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderChangelog(commits: readonly ConventionalCommit[]): string {
  return [
    "# Changelog",
    "",
    "All notable changes to Rastry are documented here. Generate a deterministic",
    "unreleased section from Conventional Commits with `bun run changelog`.",
    "",
    renderUnreleasedSection(commits),
  ].join("\n");
}

async function writeChangelog(path: string, section: string, fullDocument: string): Promise<void> {
  let existing: string | undefined;
  try {
    existing = await readFile(path, "utf8");
  } catch {
    existing = undefined;
  }

  if (existing === undefined) {
    await writeFile(path, fullDocument, "utf8");
    return;
  }

  const marker = "## [Unreleased]";
  const start = existing.indexOf(marker);
  if (start === -1) {
    await writeFile(path, `${section}\n\n${existing.trimStart()}`, "utf8");
    return;
  }

  const nextHeading = existing.indexOf("\n## ", start + marker.length);
  const end = nextHeading === -1 ? existing.length : nextHeading + 1;
  await writeFile(path, `${existing.slice(0, start)}${section}${existing.slice(end)}`, "utf8");
}

async function main(): Promise<void> {
  const options = parseOptions(Bun.argv.slice(2));
  const commits = readCommits(options);
  const changelog = renderChangelog(commits);

  if (!options.write) {
    process.stdout.write(changelog);
    return;
  }

  const outputPath = resolve(repositoryRoot, options.output ?? "CHANGELOG.md");
  await writeChangelog(outputPath, renderUnreleasedSection(commits), changelog);
  process.stderr.write(`Wrote ${outputPath}\n`);
}

void main().catch((error: unknown) => {
  if (error instanceof ChangelogUsageError) {
    console.error(`changelog: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  console.error(`changelog: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
