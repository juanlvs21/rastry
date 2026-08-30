# Change 0003: Complete v0.1 image operations

- Status: Implemented
- Date: 2026-08-29
- Related records: [Change 0001](./0001-shared-core-and-local-image-adapter.md), [Change 0002](./0002-safe-planning-and-dry-run.md)

## Context

Rastry's v0.1 product contract includes crop, transparent trim, padding,
proportional and exact resize, conversion, metadata removal, and safe batch
execution. The current shared contract and JSON schema only describe
`resize`, `convert`, and `strip-metadata`. The core validator therefore cannot
reject malformed geometry or incompatible operation combinations before a run.

The Bun.Image adapter currently supports the existing resize and conversion
paths, but explicitly rejects `resize.fit = "cover"`; crop, trim, and padding
have no execution path. Metadata removal is currently represented as a
terminal no-op because the adapter does not yet have a verified metadata
preservation/removal strategy. Transparent fixtures and alpha behavior are also
missing from the integration coverage.

This increment completes the remaining v0.1 pixel operations while preserving
the package boundaries, deterministic planning, batch error isolation, default
no-overwrite policy, and configured pixel limit established by Changes 0001 and 0002.

## Change

Extend pipeline schema version 1 additively with `crop`, `trim`, and `padding`,
and make the geometry and alpha behavior explicit at the contract boundary.
The version remains 1 because these are new operation variants and do not
reinterpret existing valid operation shapes.

The proposed operation rules are:

- `crop` has exactly one geometry mode: an explicit source `area` with
  non-negative integer `x` and `y` plus positive integer `width` and `height`,
  or positive target `width` and `height` plus a required shared `anchor`.
  `area` cannot be combined with target dimensions or `anchor`; crop never
  enlarges an image or silently pads an out-of-bounds area.
- `trim` removes the transparent border using an optional integer
  `alphaThreshold` in the inclusive range 0–255. The default is 0, meaning
  only fully transparent pixels are trimmed. It requires an alpha-capable
  input, and an image with no remaining visible bounds returns a stable
  `EMPTY_ALPHA_BOUNDS` error.
- `padding` requires explicit non-negative integer `top`, `right`, `bottom`,
  and `left` dimensions, with at least one side greater than zero. Its
  background is either `{ "transparent": true }` or an opaque/alpha color
  object with a canonical `#RRGGBB` color and optional integer `alpha` from 0
  to 255. The two background forms are mutually exclusive.
- The shared anchor set is `top-left`, `top`, `top-right`, `left`, `center`,
  `right`, `bottom-left`, `bottom`, and `bottom-right`. It is required for
  anchored crop and for `resize.fit = "cover"`; it is rejected for
  `contain` and `fill`.
- `contain` preserves the current proportional, no-enlargement behavior and
  must fit within the requested box. `cover` scales until the requested box is
  filled, removes the excess according to `anchor`, and returns exactly the
  requested dimensions. `fill` remains an explicit aspect-ratio-changing
  resize.
- Transparency is never discarded implicitly. A pipeline that explicitly
  creates transparent padding and ends in JPEG is rejected during validation;
  an input that contains alpha and is converted to JPEG returns a stable
  `ALPHA_NOT_SUPPORTED` execution error unless a future explicit flattening
  operation is introduced.

Update `packages/contracts/src/index.ts` and
`packages/contracts/schema/pipeline.schema.json` together so TypeScript
consumers and serialized configurations have the same discriminated-union and
field rules. Add the corresponding structural and cross-operation checks to
`packages/core/src/plan.ts`. Implement the pixel operations and preflight
checks in `packages/image-engine/src/index.ts`; Bun.Image remains the only
pixel-processing adapter.

## Scope

### Included

- Shared types for anchors, crop areas, trim alpha thresholds, padding
  dimensions, and padding backgrounds.
- JSON schema support for the three new operations with strict unknown-field
  rejection and invalid-combination rules.
- Core validation before any file is decoded or processed.
- Bun.Image implementations for crop, transparent trim, padding, contain,
  cover, fill, conversion, and metadata removal.
- Dimension and pixel-limit preflight for source and transformed images,
  including overflow-safe checks for crop and padding results.
- Stable domain/engine errors for invalid geometry, unsupported alpha output,
  empty trim bounds, oversized images, encoding failures, and output
  collisions.
- Transparent fixtures and one integration scenario per new operation, plus
  regression coverage for contain, cover, alpha preservation/discard rules,
  metadata, output format, dimensions, output bytes, dry-run, and batch
  isolation.

### Not included

- New image formats, background removal, color management, or a general
  compositing/flattening operation.
- Overwrite support, suffixing conflicts, or changes to output naming.
- Desktop RPC, presets, watch mode, or changes to the CLI's argument surface
  beyond accepting the shared pipeline contract.

## Acceptance criteria

1. The contracts package exports the new operation types and the JSON schema
   accepts every supported shape while rejecting unknown fields, missing
   required geometry, invalid anchors, invalid colors/alpha values, negative
   dimensions, and mutually exclusive fields.
2. `validatePipeline` rejects invalid operation combinations before an image is
   decoded, including crop geometry conflicts, anchor misuse, transparent
   padding followed by JPEG conversion, and unsupported schema versions.
3. Crop produces the requested dimensions, honors explicit area or anchor, and
   rejects out-of-bounds areas without writing an output.
4. Trim removes only the transparent border defined by `alphaThreshold`,
   preserves visible pixels, and returns stable errors for non-alpha or fully
   transparent inputs.
5. Padding produces the expected dimensions and exact border color/alpha for
   both transparent and colored backgrounds.
6. Contain, cover, and fill have verified dimensions and aspect-ratio behavior;
   cover uses the declared anchor and no longer returns
   `UNSUPPORTED_OPERATION`.
7. PNG and WebP preserve alpha when requested, JPEG never silently discards
   alpha, and metadata removal is observable on output rather than a no-op.
8. Source and transformed images exceeding `maxPixels` fail with
   `IMAGE_TOO_LARGE` before an output is written.
9. Existing outputs and input files remain byte-for-byte unchanged; dry-run
   creates no directories or files, and one failed batch item does not prevent
   other valid items from completing.
10. Integration tests verify output format, dimensions, metadata, alpha,
    representative bytes, stable errors, and the default no-overwrite policy.

## Consequences

### Positive

- All v0.1 operations have one versioned, serializable contract shared by the
  CLI, desktop, core, and image engine.
- Geometry and alpha behavior are deterministic and inspectable in a plan
  before processing starts.
- Bun.Image behavior is covered by real local fixtures instead of being inferred
  from type declarations or silently accepted by the adapter.
- Pixel-limit and no-overwrite guarantees continue to apply to the new paths.

### Negative

- The contract is more explicit and verbose than a shorthand such as a single
  padding integer or an implicit center anchor.
- Alpha-to-JPEG requests may fail until an explicit flattening operation exists.
- Metadata assertions and exact-byte fixtures may need maintenance when the Bun
  version or codec implementation changes.
- Some geometry validation depends on decoded dimensions and therefore remains
  an isolated per-file engine failure after the shared structural validation.

## Alternatives considered

### Let Bun.Image infer geometry and alpha behavior

Rejected because out-of-bounds crop, transparent JPEG conversion, and metadata
handling would vary by runtime behavior and could produce silent data loss.

### Use an implicit center anchor

Rejected for the new anchored shapes because the pipeline should describe the
placement decision explicitly and remain easy to preview in the desktop app.

### Bump the pipeline schema to version 2

Deferred. The change adds discriminated-union variants and does not alter the
meaning of existing valid operations. A version bump remains appropriate if
implementation reveals an incompatible change to existing resize, conversion,
or metadata semantics.

### Implement the operations in the CLI or desktop app

Rejected because it would duplicate pixel behavior and break the shared-core
architecture.

## Implementation plan

1. Define shared `Anchor`, crop-area, trim, padding-background, and padding
   dimension types in `packages/contracts/src/index.ts`; extend the strict
   pipeline schema without changing the schema version.
2. Add field whitelists, value checks, operation-order checks, and stable
   validation messages in `packages/core/src/plan.ts`. Keep planning free of
   filesystem mutations and preserve output naming and overwrite checks.
3. Add a Bun.Image behavior spike for contain, cover, alpha, metadata, and
   byte output using the Bun backend explicitly. Record any Bun API limitation
   in the implementation or tests before relying on it.
4. Implement crop, trim, padding, cover, alpha checks, metadata removal, and
   transformed-dimension pixel-limit checks in
   `packages/image-engine/src/index.ts`.
5. Add deterministic transparent and metadata-bearing fixtures. Add one
   integration test per operation and extend the format, safety, dry-run, and
   batch tests with invalid and regression cases.
6. Run the package tests and `bun run check`; update this record to
   Implemented only after the acceptance criteria and observable safety
   guarantees pass.

## Verification

- `packages/contracts/src/index.ts` and
  `packages/contracts/schema/pipeline.schema.json` describe the same operation
  shapes.
- `packages/core` tests prove invalid combinations fail before execution and
  retain stable error codes.
- `packages/image-engine` integration tests run against real Bun.Image output
  and inspect metadata, dimensions, alpha, format, and representative bytes.
- A small transparent fixture exercises crop, trim, padding, contain/cover
  interactions, and JPEG alpha rejection.
- A metadata-bearing fixture proves `strip-metadata` changes the output as
  specified.
- Pixel-limit tests cover both decode-time and transformed-canvas limits.
- Existing-output sentinels, input bytes, dry-run directories, and batch
  summaries verify that safety behavior from Changes 0001 and 0002 is intact.
- `bun run check` passes with no generated directories or unrelated files
  included.

## Follow-up

- Add CLI flags and desktop controls for the finalized operation shapes after
  the shared contract is stable.
- Document operation examples and visual semantics in the future site and CLI
  reference.
- Consider an explicit flatten/background operation if users need a safe,
  intentional alpha-to-JPEG workflow.
- Revisit schema versioning if future operations require incompatible changes
  to the v1 shapes.
