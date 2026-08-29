# Feature 001: safe planning and dry-run

Status: implemented

## Objective

Deliver Rastry's first useful workflow: accept one or more images and a
declarative pipeline, validate them, and produce a safe transformation plan
without writing files or modifying the originals.

This feature establishes the behavioral boundary that the CLI and desktop
application will share. Pixel processing remains behind
`@rastry/image-engine` until the `Bun.Image` spike is complete.

## User story

As a user preparing web assets, I want to see which files would be processed
and where they would end up, so that I can automate or review an operation
without risking overwrites of my originals.

## Scope

- Accept one or more input paths.
- Validate the pipeline version and the initial operations: `resize`,
  `convert`, and `strip-metadata`.
- Derive `rastry-output` next to the first input when no output directory is
  provided.
- Generate output names that match the final format (`jpeg` is represented as
  `.jpg`).
- Reject empty inputs, unsupported versions, invalid operations, explicit
  overwrite requests, output paths equal to inputs, and name collisions.
- Return an `ExecutionPlan` marked as dry-run, including files, pipeline,
  output directory, and warnings.
- Expose the same behavior through the public `@rastry/core` API and the CLI,
  including JSON output for automation.

## Out of scope

- Decoding, transforming, or encoding images.
- Disk writes and actual plan execution.
- Checking input existence or permissions as part of planning.
- A suffixing policy for conflicts; during this first feature, conflicts are
  rejected explicitly.
- Presets, pipelines loaded from files, desktop RPC, and progress reporting.

## Acceptance criteria

1. A valid pipeline for one or more inputs produces a deterministic plan.
2. The output format and derived path are correct for PNG, JPEG, and WebP.
3. No planning call creates directories, creates files, or modifies the input.
4. Validation and safety failures are domain errors identified by stable codes.
5. Two inputs that would produce the same output file fail before returning a
   partial plan.
6. The CLI can present the plan as text and JSON, and returns a non-zero exit
   code for invalid requests.
7. Tests cover the public core flow and the CLI user flow, grouped by this
   feature rather than by implementation file.

## Implementation sequence

1. Keep versioned pipeline and plan contracts in `packages/contracts`.
2. Complete and harden validation, path derivation, and domain errors in
   `packages/core`.
3. Keep the CLI as an adapter for arguments, presentation, JSON, and exit
   codes; do not duplicate safety rules there.
4. Verify the public core contract with integration tests and the complete CLI
   flow with process-level tests.
5. Run `bun run check` before considering the feature complete.

## Test strategy

Tests live in dedicated `test/integration/` folders and are grouped by
behavior:

- `packages/core/test/integration/safe-planning.test.ts`: public plan
  contract, validation, paths, collisions, and absence of mutations.
- `apps/cli/test/integration/safe-planning-cli.test.ts`: real CLI invocation,
  JSON output, human-readable output, and observable errors.

There is no test file for every function or source file. Unit coverage is
reserved for pure logic with edge cases that provide a guarantee not already
provided by these integration tests.

## Open decisions for the next iteration

- Define how input formats and input existence are validated before connecting
  the image engine.
- Define actual execution and per-file summaries without breaking batch error
  isolation.
- Decide when a collision is rejected and when an explicit suffix is allowed.
