# Change 0001: Shared TypeScript core with a local image adapter

- Status: Accepted
- Date: 2026-08-29

## Context

Rastry must provide the same predictable image workflow through a Bun CLI and
an Electrobun desktop application. The product is local-first: images must not
be uploaded, and the default behavior must never overwrite an original file.

The two interfaces will evolve at different speeds, but duplicating validation,
pipeline behavior, output naming, or safety rules in each interface would make
their results diverge. At the same time, Bun.Image details should not leak into
planning and validation code, because that would make the domain rules harder to
test and replace.

## Change

Rastry will use a dependency-directed monorepo with a shared TypeScript domain
core:

```text
apps/cli and apps/desktop
          |
          v
packages/core and packages/image-engine
          |
          v
     packages/contracts
```

- `packages/contracts` owns shared public types, pipeline configuration shapes,
  and schema version identifiers.
- `packages/core` owns pipeline validation, execution planning, output-path
  safety, dry-run behavior, metrics, and domain errors. It has no UI or native
  desktop dependencies.
- `packages/image-engine` is the sole adapter for Bun.Image decoding, pixel
  operations, encoding, and result writes.
- `apps/cli` owns argument parsing, preset loading, terminal presentation, and
  exit codes. It invokes the shared core and does not reimplement safety rules.
- `apps/desktop` uses an Electrobun main process and exposes filesystem and
  engine operations to the React webview only through typed RPC.

All execution requests must be validated and planned before processing begins.
Original files are never overwritten by default; output paths must be resolved
and checked before any write. Dry-run and plan-preview paths perform no
filesystem mutations.

## Scope

This change covers the package boundaries, runtime responsibilities, safety
invariants, the shared execution contract, and the initial local image-engine
implementation used by the CLI. It does not implement desktop RPC, preset
loading, or the remaining v0.1 pixel operations.

## Acceptance criteria

1. CLI and desktop workflows can use the same contracts and core rules.
2. Bun.Image calls are isolated to `packages/image-engine`.
3. The webview has no direct filesystem authority.
4. Planning and execution paths preserve the no-overwrite and dry-run
   guarantees.
5. Batch execution can report an individual failure without hiding other
   results.

## Consequences

### Positive

- CLI and desktop can share deterministic behavior and configuration.
- Core safety rules can be tested without a UI, native runtime, or image fixture
  for every validation case.
- Bun.Image remains replaceable behind one narrow processing boundary.
- Future preset and pipeline consumers can use the same versioned contracts.

### Negative

- Features must be designed across contracts, core, and adapter boundaries
  instead of being implemented entirely in one application.
- The image engine needs an explicit execution result contract in addition to
  the existing planning contract.
- Typed RPC adds a boundary that must be kept in sync with the shared domain
  API.

## Alternatives considered

### Implement image processing separately in the CLI and desktop app

Rejected because this would duplicate behavior and make safety rules, format
support, or output naming likely to diverge between interfaces.

### Put Bun.Image calls directly in `packages/core`

Rejected because it would couple pure validation and planning to a
runtime-specific image API, reduce testability, and violate the adapter
boundary.

### Give the desktop webview direct filesystem access

Rejected because privileged filesystem and processing operations belong in the
Electrobun main process, with a typed RPC boundary for the webview.

## Implementation plan

1. Keep shared configuration and plan types in `packages/contracts`.
2. Keep deterministic validation and planning in `packages/core`.
3. Implement Bun.Image decoding, operations, encoding, and writes only in
   `packages/image-engine`.
4. Keep CLI and desktop behavior as adapters over the shared packages.
5. Add typed desktop RPC after the shared execution contract is stable.

## Verification

- Package dependency direction is `apps -> core/image-engine -> contracts`.
- Core has no UI or native desktop imports.
- Dry-run and output safety have public integration coverage.
- `packages/image-engine` executes supported PNG, JPEG, and WebP conversions
  locally through Bun.Image.
- The desktop webview still has no direct filesystem authority; typed RPC is
  intentionally deferred until the desktop execution surface is implemented.

## Follow-up

- Complete compatibility and build verification on macOS and Linux.
- Extend the adapter for the remaining v0.1 pixel operations: crop, trim, and
  padding.
- Add typed desktop RPC over the stable execution and summary contracts.
