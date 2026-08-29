# ADR 0001: Bun monorepo with shared core

- Status: Accepted
- Date: 2026-08-28

## Context

Rastry needs a CLI and desktop application with identical image-transformation behavior. It must process locally and avoid accidental source-file overwrites.

## Decision

Use Bun workspaces for `apps/*` and `packages/*`. Put versioned configuration types in `@rastry/contracts`, deterministic planning and safety rules in `@rastry/core`, and pixel operations behind `@rastry/image-engine`. Build the CLI with Bun and the desktop app with Electrobun 2.x, React, and Bun as the main-process runtime.

The desktop webview has no direct filesystem access. Future filesystem and engine operations will run in the main process and be exposed through typed RPC.

## Consequences

- CLI and desktop can share rules without importing each other.
- Image API changes remain isolated in one adapter.
- Electrobun/Hutch generated state is local and ignored by Git.
- The initial CLI can plan operations before the image engine spike is complete.

