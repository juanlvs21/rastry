# Change 0005: CLI presets and declarative pipeline execution

- Status: Implemented
- Date: 2026-09-02
- Related records: [Change 0001](./0001-shared-core-and-local-image-adapter.md), [Change 0002](./0002-safe-planning-and-dry-run.md), [Change 0003](./0003-complete-v0-1-image-operations.md), [Change 0004](./0004-deterministic-preflight-and-batch-execution.md)

## Context

Rastry's shared contracts, image engine, deterministic discovery, preflight,
and batch execution now cover the v0.1 transformation foundation. The CLI can
accept explicit files or directories, build a safe pipeline from shorthand
flags, show a JSON or human-readable plan, and execute it locally.

The CLI does not yet expose the reusable pipeline model described in
`rastry.md`. It has no `run` command, no preset loader, and no way to invoke
the new crop, trim, or padding operations without duplicating their behavior
as application-specific flags. Only `examples/presets/web.json` exists, and it
is not currently validated or loaded by the CLI.

This change makes declarative JSON presets the first reusable CLI workflow. It
keeps parsing and file loading at the CLI boundary while using the existing
contracts and core validator as the single source of truth for pipeline
semantics.

## Change

Add a `run` command that accepts a file or directory selection and a preset
reference:

```text
rastry run ./public --preset web
rastry run ./public --preset ./presets/marketing.json --output ./optimized --execute
```

The initial preset format is the existing versioned JSON pipeline contract. A
preset must contain a supported schema version and at least one valid
operation. The CLI will:

- resolve the three shipped named presets (`web`, `ecommerce`, and `social`)
  from versioned files under `examples/presets/`;
- load custom presets from an explicit JSON file path;
- parse JSON through an `unknown` boundary and validate it with
  `validatePipeline` before creating a plan;
- route the resulting `PipelineConfig` through the existing discovery-aware
  planner and image engine;
- preserve `--output`, `--dry-run`, `--execute`, and `--json` for preset runs;
- reject mixing preset execution with shorthand operation flags such as
  `--to`, `--quality`, `--max-width`, or `--max-height` until an explicit
  override model is designed; and
- report missing, malformed, unsupported, or invalid presets with stable CLI
  error codes and no filesystem mutation.

The existing shorthand command remains supported for backwards compatibility.
Preset execution is the first CLI path that can use every operation in the
shared v0.1 contract without reimplementing image behavior in the CLI.

## Scope

### Included

- `run` command parsing and `--preset` handling in `apps/cli`.
- A CLI-local preset resolver for shipped names and explicit JSON paths.
- Runtime validation of preset JSON using the shared core validator.
- Version and unknown-field rejection through the existing pipeline rules.
- Shipped `web`, `ecommerce`, and `social` preset files.
- Human-readable and machine-readable preset errors and execution plans.
- CLI integration tests for built-in presets, custom files, invalid JSON,
  unsupported schema versions, conflicting flags, dry-run safety, and execute
  behavior.
- README and CLI help examples for the new command.

### Not included

- YAML support or a second preset serialization format.
- A preset creation or editing command.
- Global user preset directories, sync, accounts, or cloud storage.
- Arbitrary operation-specific CLI flags for crop, trim, or padding.
- Desktop preset loading or RPC; the desktop will consume the shared contract
  in its own increment.
- Watch mode, overwrite support, automatic suffixing, or new image formats.

## Acceptance criteria

1. `rastry run <input...> --preset web` resolves a shipped preset and produces
   the same deterministic plan and execution behavior as the equivalent direct
   `PipelineConfig`.
2. `ecommerce` and `social` are valid, substantive presets and are included in
   the versioned repository examples.
3. An explicit custom JSON path can be loaded and executed through the same
   core and image-engine boundaries.
4. Malformed JSON, missing required fields, unknown fields, invalid operation
   combinations, and unsupported schema versions fail before planning or
   writing, with stable actionable errors.
5. Preset dry-runs expose the resolved pipeline, deterministic file list,
   output paths, warnings, and preflight conflicts in both text and JSON.
6. Preset execution supports files and recursively discovered directories,
   preserves deterministic ordering, isolates per-file failures, and retains
   the no-overwrite guarantee.
7. `--output`, `--dry-run`, `--execute`, and `--json` behave consistently for
   preset runs; conflicting shorthand operation flags are rejected clearly.
8. The existing shorthand command continues to pass its current integration
   tests without behavior changes.
9. The CLI help and README document built-in and custom preset usage, file
   format, validation behavior, and the default dry-run policy.
10. `bun run check` and the compiled CLI build pass without generated or
    unrelated files being included.

## Consequences

### Positive

- Users can express complete pipelines, including crop, trim, and padding,
  without adding a separate CLI flag for every operation.
- Presets are readable, version-controlled, reproducible, and ready for the
  future desktop consumer.
- Preset validation and execution reuse the existing shared safety boundary.
- The CLI retains a concise shorthand for simple one-off conversions.

### Negative

- The first implementation has two CLI invocation styles: shorthand flags and
  declarative presets.
- Preset overrides are intentionally unavailable until their precedence and
  serialization rules are designed.
- Shipped named presets need a packaging strategy so compiled binaries and
  source-based development resolve the same files.
- JSON-only presets defer YAML and user-managed preset discovery until actual
  reuse patterns justify them.

## Alternatives considered

### Add flags for every image operation

Rejected because crop, trim, padding, alpha, and future operations would make
the CLI surface verbose and would duplicate the declarative contract in the
application layer.

### Load presets without shared validation

Rejected because malformed or newer pipeline shapes could reach planning or
execution inconsistently. Presets must pass the same validator as every other
pipeline source.

### Support YAML and JSON together immediately

Deferred to keep the first reusable format dependency-light, easy to inspect,
and aligned with the schema already present in the repository.

### Search arbitrary global directories for preset names

Deferred because platform-specific configuration locations and precedence
rules would expand the scope before the local preset workflow is validated.

### Implement preset operations inside the CLI

Rejected because pixel behavior belongs to `packages/image-engine`, while
pipeline validation and safety belong to `packages/core`.

## Implementation plan

1. Add a runtime-safe preset loading module under `apps/cli/src/` that resolves
   built-in names and explicit JSON paths, reads unknown data, parses it, and
   delegates structural validation to `validatePipeline`.
2. Define stable preset-related CLI errors for missing files, invalid JSON,
   invalid pipeline data, unsupported schema versions, and conflicting flags.
3. Extend CLI argument parsing and help text with `run` and `--preset`, while
   preserving the existing shorthand invocation and execution controls.
4. Add `examples/presets/ecommerce.json` and
   `examples/presets/social.json`; make the built-in resolver use the same
   versioned files during source execution and CLI compilation.
5. Route the resolved pipeline through
   `createExecutionPlanFromInputs(..., cliPlanningFileSystem)` and
   `createImageEngine()` without introducing CLI-specific image operations or
   safety checks.
6. Add behavior-focused CLI tests for built-in and custom presets, invalid
   configuration, conflicting flags, deterministic directory plans, dry-run
   non-mutation, execution summaries, and legacy shorthand compatibility.
7. Update `README.md`, CLI help, and the change-record index with the stable
   command examples and preset rules.
8. Run `bun run check` and `bun run build:cli`; change this record to
   `Implemented` only after all acceptance criteria pass.

## Verification

- Built-in preset commands produce the expected `PipelineConfig` and output
  names for representative PNG, JPEG, and WebP inputs.
- A custom preset is loaded from a temporary JSON file and cannot write when
  parsing or validation fails.
- Invalid schema versions and operation combinations return non-zero CLI exit
  codes before the image engine is called.
- Directory preset runs preserve the deterministic discovery and preflight
  behavior from Change 0004.
- JSON output is parseable and contains the resolved pipeline, plans, errors,
  and summaries needed by automation agents.
- Existing output sentinels and source files remain unchanged in dry-run,
  conflict, and failed-preset scenarios.
- The current shorthand CLI tests remain green.
- `bun run check` and `bun run build:cli` pass on the supported Bun runtime.

## Follow-up

- Add an explicit preset save/edit workflow after recurring user behavior is
  understood.
- Define preset search paths and precedence for user-managed local presets.
- Add desktop preset selection and import/export over the typed RPC boundary.
- Document each shipped preset and operation in the future Astro/Starlight
  site.
- Revisit CLI-level operation overrides only with a clearly serialized merge
  model.
