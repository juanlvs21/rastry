# Change 0006: Release quality and cross-platform validation

- Status: Implemented
- Date: 2026-09-02
- Related records: [Change 0001](./0001-shared-core-and-local-image-adapter.md), [Change 0002](./0002-safe-planning-and-dry-run.md), [Change 0003](./0003-complete-v0-1-image-operations.md), [Change 0004](./0004-deterministic-preflight-and-batch-execution.md), [Change 0005](./0005-cli-presets-and-declarative-pipelines.md)

## Context

Rastry now has the v0.1 image operations, deterministic input discovery and
preflight, batch execution, and reusable CLI presets. Local validation is
available through `bun run check`, and the CLI can be compiled with
`bun run build:cli`.

The repository does not yet verify these guarantees automatically on the
supported operating systems. There is no GitHub Actions workflow, no
cross-platform format compatibility matrix, no automated CLI build artifact,
and no changelog generation process. The release process would therefore rely
on a developer's local environment and could allow platform-specific regressions
or version drift to go unnoticed.

This change establishes the minimum release-quality baseline for the v0.1
foundation without introducing desktop installers, signed distribution, or
automatic updates.

## Change

Add an automated quality and release-preparation workflow that:

- runs the repository checks on Windows, macOS, and Linux;
- uses the repository's pinned Bun version and frozen lockfile;
- validates the compiled CLI in addition to format, lint, typecheck, and tests;
- exercises PNG, JPEG, and WebP input/output behavior, metadata removal,
  alpha handling, dimensions, deterministic planning, and no-overwrite safety;
- publishes the compiled CLI as a CI artifact for inspection;
- provides deterministic changelog generation from Conventional Commits; and
- documents the commands and criteria required before a release candidate.

The workflow must remain local-first: image fixtures are processed inside CI,
no user files are uploaded, and no telemetry or cloud processing is introduced.

## Scope

### Included

- GitHub Actions CI configuration under `.github/workflows/`.
- Windows, macOS, and Linux test/build jobs using Bun 1.4.0.
- Frozen dependency installation and repository-wide `bun run check`.
- Compiled CLI validation with `bun run build:cli`.
- CI artifact upload for the compiled CLI binary.
- Explicit format compatibility and safety regression coverage using local
  fixtures.
- A repository changelog and a deterministic changelog-generation command.
- Release-readiness documentation in `README.md` or `CONTRIBUTING.md`.

### Not included

- Desktop installer generation, signing, notarization, or auto-updates.
- Publishing binaries to a package registry or release page.
- A production deployment of the website.
- Watch mode, telemetry, cloud processing, or new image formats.
- Performance benchmarking as a release gate beyond basic smoke coverage.
- Changes to pipeline semantics, preset resolution, or the no-overwrite policy.

## Acceptance criteria

1. Every pull request runs the required checks on Windows, macOS, and Linux.
2. CI uses Bun 1.4.0 or the repository-declared compatible version and installs
   dependencies from the lockfile without modifying it.
3. Format checking, linting, typechecking, all tests, and the CLI compilation
   complete successfully on the supported matrix.
4. CI verifies PNG, JPEG, and WebP conversion, resize/crop/trim/padding,
   metadata removal, alpha behavior, deterministic batches, and safe output
   handling using repository fixtures.
5. The compiled CLI is uploaded as a uniquely named artifact containing the
   expected executable for the runner platform.
6. A changelog-generation command produces stable output from Conventional
   Commit messages and does not require network access or secrets.
7. `CHANGELOG.md` records the implemented changes through the current release
   baseline and explains how future entries are generated.
8. Release checks preserve the local-first, dry-run, batch-isolation, and
   no-overwrite guarantees.
9. Documentation explains the local commands, CI expectations, artifact
   outputs, and the boundary between CI validation and future distribution.
10. The workflow does not include generated directories, credentials, user
    images, or unrelated files in committed changes.

## Consequences

### Positive

- Platform-specific regressions become visible before merging or releasing.
- The CLI build is verified as an executable artifact rather than only as
  source-level TypeScript.
- Format and safety behavior remain covered as the project evolves.
- Conventional Commits provide a predictable source for release notes.
- The release baseline stays independent of the future desktop and website
  distribution work.

### Negative

- CI duration and maintenance increase with a three-operating-system matrix.
- Bun.Image codec behavior may require platform-specific test diagnostics when
  a runner changes its runtime or image backend.
- Changelog output depends on consistent commit messages and release ranges.
- Uploaded artifacts consume CI storage until retention rules are defined.

## Alternatives considered

### Run checks only on the developer's machine

Rejected because local validation cannot detect operating-system-specific
behavior or guarantee that the compiled CLI works in a clean environment.

### Test only on Linux

Rejected because Rastry explicitly supports Windows and macOS, and the CLI and
desktop toolchain need platform coverage before distribution work begins.

### Build and publish installers in this change

Deferred to the distribution phase after the desktop application and release
identity are stable. This change verifies the CLI foundation without creating
signing, notarization, or update infrastructure prematurely.

### Generate changelogs from arbitrary commit text

Rejected because the repository already enforces Conventional Commits, which
provides a stable category and scope vocabulary for release notes.

### Upload source images or use an external image service in CI

Rejected because all fixtures are already local and the local-first promise
must hold in development and automation environments.

## Implementation plan

1. Define the supported CI matrix, Bun version, cache strategy, lockfile
   policy, permissions, and artifact retention in `.github/workflows/ci.yml`.
2. Run `bun run check` and `bun run build:cli` on each supported operating
   system, keeping the workflow's installation and commands reproducible.
3. Add or refine behavior-focused compatibility tests for the supported image
   formats, alpha/metadata behavior, dimensions, deterministic planning, and
   no-overwrite guarantees without duplicating engine logic in CI scripts.
4. Upload the platform-specific compiled CLI artifact only after the build and
   checks succeed; exclude `node_modules`, source maps, temporary outputs, and
   other generated directories unless explicitly needed for inspection.
5. Add a Bun-based changelog script under `scripts/`, a root package command,
   and an initial `CHANGELOG.md` that groups Conventional Commits by release
   and preserves a stable unreleased section.
6. Document local release checks, CI artifact expectations, changelog usage,
   and known boundaries in `README.md` or `CONTRIBUTING.md`.
7. Validate the workflow configuration and run the complete local check before
   changing this record to `Implemented`.

## Verification

- `bun run check` passes locally with no generated files included.
- `bun run build:cli` produces a runnable CLI executable.
- CI configuration covers Windows, macOS, and Linux with Bun 1.4.0 and frozen
  lockfile installation.
- Matrix jobs execute the same public checks and the explicit supported-format
  compatibility tests.
- The compatibility suite covers local PNG, JPEG, and WebP inputs and outputs,
  deterministic plans, and no-overwrite safety; the existing image-engine
  suite covers geometry, metadata, alpha, dry-run, and batch isolation.
- Artifact names identify the runner platform and contain only the intended
  compiled CLI output.
- Changelog generation is deterministic for a fixed commit range and works
  without network access or secrets.
- `CHANGELOG.md` and contributor documentation describe the resulting process.

## Follow-up

- Add desktop build, installer, signing, and notarization jobs with the v0.2
  desktop implementation.
- Publish release artifacts and automate GitHub Releases after the release
  identity and versioning policy are finalized.
- Add targeted performance benchmarks when representative batch workloads are
  available.
- Add website build and deployment checks when `apps/web` is implemented.
- Define migration and compatibility notes when the pipeline schema requires a
  breaking version change.
