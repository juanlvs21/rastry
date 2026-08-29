# AGENTS.md

## Mission

Build Rastry as a local-first image tool whose CLI and desktop application share one deterministic TypeScript domain core. Treat `rastry.md` as the product source of truth and preserve the default guarantee that originals are never overwritten.

## Toolchain and commands

- Runtime and package manager: Bun 1.4.0+.
- Install: `bun install`.
- CLI: `bun run dev:cli -- --help`.
- Desktop: `bun run dev:desktop`.
- Checks: `bun run check`.
- Do not introduce Node-only runtime behavior into shared packages without documenting why Bun cannot provide the requirement.

## Architecture

- `packages/contracts`: shared public types and versioned configuration shapes. Keep it dependency-light.
- `packages/core`: pure validation, planning, output naming, dry-run, metrics, and domain errors. No UI framework or native desktop imports.
- `packages/image-engine`: the sole pixel-processing adapter. Keep Bun image API details out of core.
- `apps/cli`: argument parsing, terminal output, exit codes, and preset loading only.
- `apps/desktop`: Electrobun main process plus React webview. Filesystem access stays in the main process and crosses into the webview only through typed RPC.
- `apps/web`: Astro/Starlight site when that phase begins; do not couple it to desktop release artifacts.

Dependency direction is `apps -> core/image-engine -> contracts`. Never import from an app into a package or duplicate core safety rules in an app.

## Safety invariants

- Never overwrite an input file by default.
- Resolve and validate output paths before any write.
- Dry-run must perform no filesystem mutations.
- Batch failures are isolated per file and summarized clearly.
- Reject unknown pipeline schema versions and invalid operation combinations.
- Telemetry is off by default and must remain explicit opt-in if introduced.

## Working conventions

- Prefer small modules with named exports and explicit types at package boundaries.
- Use `unknown` at untrusted boundaries, validate it, and avoid `any`.
- Add tests beside the package under `test/` for every safety or planning rule.
- Update an ADR in `docs/adr/` for decisions that alter package boundaries, runtime choices, persistence formats, or security guarantees.
- Keep generated directories (`node_modules`, `dist`, `build`, `.hutch`) untracked.

## Codebase discovery

This repository uses the codebase-memory knowledge graph. Prefer its structural tools in this order: `search_graph`, `trace_path`, `get_code_snippet`, `check_index_coverage`, `query_graph`, and `get_architecture`. Use `rg` for literal text, configuration, or any range the index reports as missed. Call `list_projects` or `index_status` at the start of a new exploration session, and check coverage for every code path used as material evidence.

## Definition of done

A change is complete when relevant types pass, tests pass, CLI/desktop behavior is verified in proportion to the change, documentation matches user-visible behavior, and no generated or unrelated files are included.

