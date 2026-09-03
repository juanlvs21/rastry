# Change 0004: Deterministic preflight and batch execution

- Status: Implemented
- Date: 2026-09-02
- Related records: [Change 0002](./0002-safe-planning-and-dry-run.md), [Change 0003](./0003-complete-v0-1-image-operations.md)

## Context

Rastry can currently build a safe path plan for explicit input strings and can
execute a list of planned files through the image engine. The planner does not
inspect the filesystem, expand directories, or detect outputs that already
exist. Directory inputs are therefore treated as individual files, directory
contents are not filtered or ordered, and the CLI cannot show a complete
preflight result before execution.

The image engine protects the final write with exclusive file creation and
isolates failures while processing sequentially, but those checks happen after
execution has started. The shared contracts also have no optional seam for
progress or cooperative cancellation, and the summary does not explicitly
represent cancellation or the invariant for partial runs.

This increment strengthens the planning and execution boundary without
changing the default no-overwrite guarantee or putting filesystem access in
the desktop webview. The CLI and future desktop main process must be able to
use the same discovery and planning rules.

## Change

Add a read-only, filesystem-backed preflight stage around the existing pure
plan construction. The stage accepts explicit files and directories, expands
directories recursively, filters discovered children to PNG, JPEG, and WebP,
sorts them deterministically, excludes the resolved output directory, and
checks input/output conditions before any write is attempted.

Keep the current synchronous path derivation and pipeline validation available
for already-resolved file lists. Add a separate asynchronous core entry point
for discovery and preflight, backed by an injected filesystem interface. The
core defines the interface but does not import Node.js or Bun filesystem APIs;
the CLI supplies the first concrete adapter and the desktop main process can
reuse the same contract later.

Existing output conflicts are represented on the affected planned file so a
batch can continue with other files. Global ambiguities such as an output
collision between planned files, an output equal to an input, an invalid output
directory, or an output directory equal to an input directory still stop plan
creation. The engine retains an exclusive final write to protect against
time-of-check/time-of-use races.

Extend execution with optional progress callbacks and a cooperative
cancellation predicate. Cancellation is checked between files; an in-progress
image operation is allowed to finish. Partial summaries explicitly account for
processed, skipped, failed, and cancelled files, with byte totals calculated
only from measurements that actually exist.

## Scope

### Included

- A dependency-injected filesystem abstraction for read-only planning:
  inspect paths, list directory entries, and check readability/writability.
- Recursive directory expansion while preserving the order of input roots.
- Case-insensitive filtering of directory children by `.png`, `.jpg`,
  `.jpeg`, and `.webp` extensions.
- Stable directory traversal ordering by normalized path, with a deterministic
  tie-breaker for platform case differences.
- Detection of duplicate resolved inputs instead of silently processing one
  file more than once.
- Lexical path containment checks that exclude the output directory subtree
  from directory expansion and reject an output directory equal to an input
  directory.
- Read-only preflight for missing/unreadable inputs, invalid output-directory
  targets, and outputs that already exist.
- Machine-readable planned-file preflight errors and human-readable/JSON CLI
  reporting of conflicts before execution.
- Preservation of the final exclusive output write as the race-safe last line
  of defense.
- Optional progress and cooperative cancellation types in the shared
  execution contract; no new CLI or desktop controls in this increment.
- A consistent partial-run summary, including an explicit cancelled count and
  a count invariant across all file statuses.
- Integration coverage for core planning, CLI directory workflows, image
  engine conflict handling, ordering, output exclusion, dry-run safety, and
  partial execution.

### Not included

- Overwrite support, automatic suffixing, or replacing the current no-overwrite
  policy.
- Following directory symlinks during recursive expansion.
- Mid-file interruption of Bun.Image operations.
- A watch mode, desktop UI, desktop RPC, or new CLI cancellation flags.
- New image formats or changes to pipeline operation semantics.

## Acceptance criteria

1. Explicit files and directory inputs produce the same shared plan behavior
   when invoked from the CLI or a future desktop main-process adapter.
2. Directory expansion is recursive, excludes the output directory subtree,
   ignores non-PNG/JPEG/WebP children case-insensitively, and returns files in
   a stable order independent of filesystem enumeration order.
3. A directory input with no supported image files returns a stable,
   actionable domain error rather than an empty executable plan.
4. Planning performs no filesystem mutation, including in dry-run mode, and
   detects missing/unreadable inputs and invalid output-directory targets
   before any image is decoded.
5. Existing output files are reported deterministically on their corresponding
   planned files; they are never replaced, while unrelated valid files in the
   same batch can still complete.
6. Output equality, output collisions, duplicate inputs, and output-directory
   containment ambiguities fail before a partial executable plan is returned.
7. The engine rechecks output exclusivity at write time, preserving safety if
   an output appears after preflight.
8. Optional progress callbacks report ordered file lifecycle events without
   changing behavior when omitted. Cooperative cancellation stops new files,
   lets the active file finish, and marks remaining files as cancelled.
9. For every execution summary,
   `processed + skipped + failed + cancelled` equals the number of planned
   files, and byte totals do not include unknown or failed measurements.
10. Core, CLI, and image-engine integration tests cover deterministic
    expansion, output exclusion, conflicts, dry-run non-mutation, batch
    isolation, progress/cancellation, and the existing v0.1 operations.

## Consequences

### Positive

- Users see the real batch and its known conflicts before writing begins.
- Directory workflows become reproducible across operating systems and file
  enumeration implementations.
- CLI and desktop can share discovery, safety, and summary semantics without
  giving filesystem access to the webview.
- Existing output races remain safe because preflight is advisory and the
  exclusive write remains authoritative.
- Future interfaces receive a stable progress/cancellation seam without
  coupling the core to a UI framework.

### Negative

- Planning becomes asynchronous for directory-aware callers and requires a
  small filesystem adapter at each process boundary.
- Recursive expansion may inspect many files before execution begins and must
  report directory-read failures clearly.
- A preflight result can become stale before writing, so both preflight and the
  final exclusive write must remain in place.
- Adding an explicit cancelled status expands the summary contract for all
  consumers.

## Alternatives considered

### Let each application expand directories independently

Rejected because the CLI and desktop could diverge in filtering, ordering,
output exclusion, and conflict behavior.

### Import Node.js filesystem APIs directly from core

Rejected because `packages/core` is the shared deterministic domain layer and
must remain independent of Bun, Node.js, and desktop runtime imports.

### Treat every existing output as a batch-fatal error

Rejected because batch failures are isolated by design. A conflict should
fail only its affected item when the remaining plan is unambiguous.

### Trust preflight and remove exclusive file creation

Rejected because another process can create an output after preflight. The
write must still fail safely on `EEXIST`.

### Use `AbortSignal` as the first cancellation contract

Deferred. A small runtime-neutral predicate keeps `contracts` dependency-light
and works for the CLI, desktop, and future adapters without assuming a DOM or
Node global type.

## Implementation plan

1. Extend `packages/contracts/src/index.ts` with planned-file preflight error
   data, progress/cancellation event types, the cancelled file status, and
   explicit summary fields. Keep the pipeline schema unchanged and update
   exported types without introducing runtime dependencies.
2. Add a filesystem interface and directory-discovery module under
   `packages/core/src/`. Implement recursive traversal, extension filtering,
   normalized stable ordering, duplicate detection, output-subtree exclusion,
   and read-only input/output preflight. Keep path derivation, pipeline
   validation, global collision checks, and output naming in the existing core
   plan path.
3. Preserve the pure plan constructor for resolved files and add an
   asynchronous discovery-aware entry point that composes discovery with plan
   construction. Export both through `packages/core/src/index.ts` and use
   stable domain error codes for discovery/preflight failures.
4. Add the concrete filesystem adapter in `apps/cli/src/` and route the CLI
   through the discovery-aware core entry point. Update text and JSON output
   to show ignored directory children, per-file preflight conflicts, and the
   resolved deterministic file list without changing existing flags.
5. Update `packages/image-engine/src/index.ts` to consume planned-file
   preflight errors, preserve per-file isolation, emit optional progress
   events, honor cooperative cancellation between files, and produce the
   explicit partial-summary invariant. Keep the exclusive `open(..., "wx")`
   write path and its race handling.
6. Add behavior-focused tests in the dedicated test trees: core tests with a
   fake filesystem, CLI tests with temporary nested folders and sentinels,
   and image-engine tests for existing-output conflicts, race-safe writes,
   cancellation, progress ordering, and mixed success/failure summaries.
7. Update the change record to `Implemented` only after the acceptance
   criteria pass, and run `bun run check` while confirming no generated or
   unrelated files are present.

## Verification

- Core tests prove deterministic expansion despite unsorted directory entries,
  extension filtering, recursive traversal, duplicate detection, output
  exclusion, and zero filesystem mutations.
- Core tests prove missing/unreadable inputs and existing outputs are visible
  before execution, while global ambiguities fail atomically.
- CLI tests prove stable text and JSON plans for nested folders and show the
  same conflict and ordering data.
- Image-engine tests prove preflight conflicts do not overwrite sentinels,
  unrelated files still process, a late-created output is rejected, and
  partial summaries satisfy the status-count invariant.
- Progress/cancellation tests prove callback order, no callbacks when the
  option is omitted, active-file completion, and cancellation accounting.
- `bun run check` passes, and dry-run tests verify that no directory or output
  file is created.

## Follow-up

- Connect the same core filesystem adapter contract to the desktop Bun main
  process and typed RPC once the desktop plan preview is implemented.
- Decide whether a future CLI should expose recursion, symlink, or conflict
  policy flags after real batch usage is observed.
- Consider a richer machine-readable discovery report if users need counts of
  ignored non-image files or directory-read warnings.
- Add watch-mode safeguards in the later roadmap phase using this output
  exclusion and deterministic planning foundation.
