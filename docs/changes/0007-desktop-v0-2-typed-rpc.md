# Change 0007: Desktop v0.2 over typed RPC

- Status: Implemented
- Date: 2026-09-02
- Related records: [Change 0001](./0001-shared-core-and-local-image-adapter.md), [Change 0002](./0002-safe-planning-and-dry-run.md), [Change 0003](./0003-complete-v0-1-image-operations.md), [Change 0004](./0004-deterministic-preflight-and-batch-execution.md), [Change 0005](./0005-cli-presets-and-declarative-pipelines.md), [Change 0006](./0006-release-quality-and-cross-platform-validation.md)

## Context

Rastry's v0.1 foundation now provides the shared pipeline contracts,
deterministic discovery and preflight, safe output planning, batch execution,
progress and cancellation controls, and the Bun.Image adapter. The CLI uses
these layers end to end, including declarative JSON presets.

The desktop package currently creates an Electrobun window and renders a
React shell, but it does not yet invoke the core or image engine. Its drop
area is intentionally disabled, there is no typed RPC boundary, and the Bun
main process has no file-selection, planning, or execution handlers. As a
result, the desktop application cannot yet provide the v0.2 experience defined
in `rastry.md` or demonstrate parity with the CLI.

This change delivers the first usable desktop workflow while preserving the
local-first and no-overwrite guarantees. The webview remains untrusted with
respect to the filesystem; all file access, planning, and image processing
stay in the Bun main process.

## Change

Implement a typed RPC workflow between the Electrobun Bun main process and the
React webview that supports:

- selecting supported image files and directories through the desktop bridge;
- dragging files or directories into the application when the platform bridge
  provides dropped paths;
- constructing a `PipelineConfig` for the supported v0.1 operations;
- generating a dry-run `ExecutionPlan` before any write is possible;
- showing planned outputs, warnings, preflight conflicts, and validation
  errors for user confirmation;
- executing an explicitly confirmed plan through `createImageEngine()`;
- streaming typed `ExecutionProgress` events for batch and per-file state;
- cancelling an active run through `ExecutionControl.isCancelled`; and
- returning a typed `ExecutionSummary` with processed, skipped, failed,
  cancelled, and byte metrics.

The RPC protocol must use serializable request, response, error, and progress
payloads. It must reuse the public types from `@rastry/contracts` and the
validation/planning APIs from `@rastry/core`; no image bytes or native objects
cross into the webview. The main process is authoritative and must validate
untrusted RPC input before planning or execution. Execution must re-check the
current filesystem state so a conflict introduced after preview cannot cause
an overwrite.

## Scope

### Included

- A typed desktop RPC contract and handlers owned by the Bun main process.
- Main-process file and directory selection plus dropped-path handling.
- A local `PlanningFileSystem` adapter for desktop planning, kept outside the
  pure core package.
- Desktop integration with `@rastry/image-engine` for actual execution.
- Main-process run/session state for one active plan and one cancellable run at
  a time, with stable run identifiers.
- Webview controls for input selection, output directory, and the complete
  supported v0.1 pipeline model: resize, crop, trim, padding, conversion,
  quality, and metadata removal.
- A plan-preview state that defaults to dry-run and requires an explicit
  execute action before writing files.
- Progress, cancellation, completion summary, per-file failures, and
  actionable validation errors in the UI.
- Desktop typechecking that covers both the React view and the Bun main
  process.
- Behavior-focused tests under the desktop `test/` tree and relevant shared
  integration tests for preview safety, RPC validation, execution, progress,
  cancellation, and output conflicts.
- Desktop usage and safety documentation in the application README or root
  documentation.

### Not included

- A new pipeline schema, new image operations, new formats, or overwrite
  support.
- Editing, saving, searching, or synchronizing presets; the desktop may accept
  a `PipelineConfig`, while preset import/export remains a follow-up to the
  reuse work described by Change 0005.
- Persistent execution history, background jobs, watch mode, telemetry,
  accounts, cloud processing, or file uploads.
- Desktop installers, signing, notarization, automatic updates, or release
  publishing.
- A second image-processing implementation in the desktop application.
- Direct filesystem access from React or browser globals used as a substitute
  for the typed native bridge.

## Acceptance criteria

1. The desktop application opens through Electrobun and exposes a typed RPC
   surface between the Bun main process and the React webview.
2. A user can select one or more supported image files and directories, or
   provide dropped paths when supported by the desktop bridge, without the
   webview reading the filesystem directly.
3. The UI can express every operation currently represented by
   `PipelineOperation`, including resize fit and anchor, crop area or anchor,
   transparent trim, padding backgrounds, conversion quality, and metadata
   removal.
4. Every run first creates a validated dry-run `ExecutionPlan` and displays
   its deterministic files, output paths, warnings, and preflight conflicts.
5. No file is written from preview, invalid RPC input, unsupported schema
   versions, invalid operation combinations, or a cancelled-before-execution
   request.
6. An explicit user action starts execution through `createImageEngine()` and
   produces the same `ExecutionSummary` semantics as the CLI for the same
   `PipelineConfig` and inputs.
7. Progress events identify the run, phase, completed count, total count, and
   per-file result where available; the UI remains responsive while a batch is
   running.
8. Cancelling a run stops starting additional files, reports remaining files
   as cancelled, and preserves already-written outputs without overwriting
   originals.
9. If an output appears or becomes unavailable after preview, execution
   reports a typed conflict or filesystem error and never replaces the file.
10. Errors crossing RPC are plain serializable values with stable codes and
    actionable messages; native `Error` objects, Bun images, file handles, and
    other non-serializable values do not cross the boundary.
11. Desktop typechecking includes the Bun main-process sources, and tests
    cover the RPC handlers and the user-visible run lifecycle through public
    boundaries.
12. `bun run check`, `bun run build:desktop`, and the relevant desktop tests
    pass without generated directories or unrelated files being committed.

## Consequences

### Positive

- Non-technical users get a local visual workflow over the same engine used by
  the CLI.
- The plan-first flow makes output paths, conflicts, and safety visible before
  execution.
- A typed and serializable bridge gives the desktop boundary explicit failure
  behavior and prevents filesystem access from leaking into React.
- Shared pipeline contracts and engine results make CLI/Desktop parity
  testable rather than dependent on duplicated UI logic.
- Progress and cancellation are exposed without moving long-running image work
  onto the webview thread.

### Negative

- The desktop application must maintain native bridge/session state in
  addition to the stateless core APIs.
- The first UI will need form state for the full operation model, including
  validation feedback for combinations that the core rejects.
- Native file dialogs and dropped-path behavior require platform-specific
  verification even though transformation semantics remain shared.
- A desktop-local planning filesystem adapter may need later extraction if the
  CLI and desktop adapters diverge.

## Alternatives considered

### Let the webview access files directly

Rejected because it violates the architecture in `rastry.md`, weakens the
security boundary, and makes the desktop behavior dependent on browser APIs.

### Duplicate planning or image transformation logic in React

Rejected because the core and image engine are the single source of truth for
validation, safety, and pixel processing. The UI should only collect and
present data.

### Send image bytes through RPC

Rejected because it increases memory pressure, complicates progress and
failure handling, and is unnecessary when the main process can operate on
local paths. RPC carries paths and typed results only.

### Execute directly from the preview object supplied by the webview

Rejected because the webview payload is untrusted and the filesystem may have
changed since preview. The main process must retain or reconstruct the
validated request and re-run the relevant preflight immediately before writes.

### Build preset management and execution history together with the first UI

Deferred because it would combine the v0.2 execution surface with the v0.3
reuse and persistence concerns. The first desktop increment accepts the same
versioned pipeline model and leaves preset storage/import for a focused change.

### Introduce a separate desktop execution service

Rejected for this increment because Electrobun's Bun main process already owns
the required local runtime. A separate service would add packaging and
lifecycle complexity without improving the local-first workflow.

## Implementation plan

1. Define the desktop RPC request/response/event unions using serializable
   contracts, run identifiers, and stable error envelopes. Include operations
   for input selection, plan preview, execution, and cancellation.
2. Add main-process adapters for native file/directory selection and the
   `PlanningFileSystem` interface. Keep path normalization, discovery, output
   preflight, and pipeline validation delegated to `@rastry/core`.
3. Add `@rastry/image-engine` to the desktop runtime dependencies and wire the
   main process to execute validated plans with progress and cancellation
   control.
4. Define the lifecycle for preview, confirmation, active execution,
   cancellation, completion, and failure. Ensure only one active run can
   mutate outputs and that an execution request cannot bypass preview or
   revalidation.
5. Replace the placeholder React shell with an accessible workflow for input
   selection/drop, output directory, operation configuration, plan preview,
   execute/cancel actions, progress, and final summary.
6. Add boundary-focused tests with fake bridge and filesystem dependencies for
   malformed RPC payloads, unsupported pipelines, dry-run non-mutation,
   deterministic plans, conflicts, progress, cancellation, and summary
   mapping. Add a parity fixture comparing desktop orchestration with the
   equivalent CLI pipeline.
7. Expand desktop typechecking to include Bun sources and verify the
   Electrobun build on the supported development platforms.
8. Document the desktop workflow, privacy boundary, default dry-run behavior,
   supported operations, and known limitations.
9. Run `bun run check`, `bun run build:desktop`, and the desktop integration
   suite. Change this record to `Implemented` only after all acceptance
   criteria pass.

## Verification

- A fresh desktop launch renders the interactive workflow and connects the
  webview to the Bun main process through the typed RPC contract.
- The Vite webview build resolves `electrobun/view` from Hutch's projected
  devkit, and desktop dev/build scripts prepare that devkit before bundling;
  this keeps the npm bootstrap stub out of the runtime bundle.
- The image file picker uses the all-files view so PNG, JPG, JPEG, and WebP
  can be selected together; core validation still rejects unsupported
  explicit file paths before planning.
- File and directory selection returns normalized paths while React has no
  direct filesystem API or native object dependency.
- Previewing a representative batch returns a deterministic plan and leaves
  source files, output directories, and existing output sentinels unchanged.
- Invalid payloads, schema versions, operation combinations, and path
  conflicts fail before image processing and cross the bridge as stable,
  serializable errors.
- An explicit execution produces the expected PNG, JPEG, or WebP outputs and
  summary metrics using `@rastry/image-engine`.
- Progress reaches started, per-file, cancelled or completed phases and the UI
  renders the current batch state without blocking.
- Cancellation leaves completed outputs intact, marks unstarted files as
  cancelled, and never overwrites an existing file.
- A conflict introduced after preview is surfaced during revalidation or
  exclusive output creation and does not replace the conflicting file.
- The same fixture and `PipelineConfig` produce equivalent plan and summary
  semantics when invoked from the desktop orchestration and CLI boundaries.
- `bun run check` and `bun run build:desktop` pass, with no generated or
  unrelated files included in the change.

## Follow-up

- Add desktop preset selection, import/export, and user-managed preset search
  paths once the v0.3 reuse workflow is designed.
- Add persistent execution history only after the run model and privacy
  expectations are validated with users.
- Add installer, signing, notarization, update, and release automation after
  the desktop workflow is stable.
- Add focused UX and performance work for very large batches without changing
  core safety semantics.
- Revisit shared local filesystem adapters if CLI and desktop behavior require
  a common package boundary.
- Keep watch mode deferred to v0.4 as specified in `rastry.md`.
