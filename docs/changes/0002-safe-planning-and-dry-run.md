# Change 0002: Safe planning and dry-run

- Status: Implemented
- Date: 2026-08-29

## Context

Rastry needs a useful first workflow that lets users review a batch before any
file is processed. The plan must be deterministic, safe against accidental
overwrites, and available through both the public core API and the CLI.

Pixel processing remains behind `@rastry/image-engine` until the Bun.Image
spike is complete.

## Change

The first workflow accepts one or more input paths and a declarative pipeline,
validates the request, and returns a dry-run `ExecutionPlan` without writing
files or modifying the originals.

The initial supported operations are `resize`, `convert`, and
`strip-metadata`. The plan derives `rastry-output` next to the first input when
no output directory is provided, uses the final format for output names, and
reports validation and safety failures with stable domain error codes.

## Scope

### Included

- One or more input paths.
- Pipeline version validation.
- Resize, conversion, and metadata-removal operation validation.
- Derived output directories and format-aware output names.
- Rejection of empty inputs, invalid operations, explicit overwrite requests,
  input/output equality, and name collisions.
- Human-readable and JSON CLI plan output.

### Not included

- Decoding, transforming, or encoding images.
- Disk writes or actual plan execution.
- Input existence and permission checks during planning.
- A suffixing policy for output conflicts.
- Presets, desktop RPC, and progress reporting.

## Acceptance criteria

1. A valid pipeline for one or more inputs produces a deterministic plan.
2. Output format and derived paths are correct for PNG, JPEG, and WebP.
3. Planning creates no directories, creates no files, and modifies no inputs.
4. Validation and safety failures use stable domain error codes.
5. Duplicate output names fail before a partial plan is returned.
6. The CLI presents text and JSON plans and returns a non-zero exit code for
   invalid requests.
7. Public core and CLI integration tests cover the observable workflow.

## Consequences

### Positive

- Users can review a batch before any filesystem mutation.
- CLI automation receives deterministic JSON output.
- The core establishes the safety boundary that the desktop application will
  reuse.

### Negative

- This workflow stops at planning until image-engine execution is implemented.
- Existing-file validation and actual output summaries must be added at the
  execution boundary.
- Conflicts are rejected until an explicit suffixing policy is designed.

## Alternatives considered

### Execute image operations immediately from the CLI

Rejected for the first increment because it would make the safety boundary
harder to verify before the image engine is validated.

### Silently suffix conflicting output names

Deferred. The first workflow rejects collisions explicitly so users do not get
unexpected output names.

### Duplicate validation in the CLI

Rejected. Safety rules belong in `packages/core` so desktop and CLI behavior
remain equivalent.

## Implementation plan

1. Keep versioned pipeline and plan contracts in `packages/contracts`.
2. Complete validation, path derivation, and domain errors in `packages/core`.
3. Keep the CLI as an adapter for arguments, presentation, JSON, and exit
   codes.
4. Verify the public core contract and complete CLI flow with integration tests.
5. Run `bun run check` before considering the change complete.

## Verification

- `packages/core/test/integration/safe-planning.test.ts` covers the public plan
  contract, validation, paths, collisions, and absence of mutations.
- `apps/cli/test/integration/safe-planning-cli.test.ts` covers real CLI
  invocation, JSON output, human-readable output, and observable errors.
- Tests are grouped by behavior rather than by production file.

## Follow-up

- Define input format and input existence validation before connecting the image
  engine.
- Define actual execution and per-file summaries without breaking batch error
  isolation.
- Decide when a collision is rejected and when an explicit suffix is allowed.
