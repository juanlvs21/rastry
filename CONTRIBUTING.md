# Contributing to Rastry

Thanks for helping build Rastry. Keep changes aligned with the local-first and no-overwrite guarantees in `rastry.md`.

## Development

1. Install Bun 1.4.0 or newer.
2. Run `bun install`.
3. Run `bun run format` to apply the repository formatter.
4. Run `bun run check` before opening a pull request.
5. Add or update tests whenever domain behavior changes.

## Architecture boundaries

- `packages/core` owns deterministic planning and safety rules. It must not import UI or Electrobun code.
- `packages/image-engine` is the only package that may perform image decoding, encoding, or pixel operations.
- `apps/cli` and `apps/desktop` are adapters. They must call shared packages instead of duplicating domain rules.
- The desktop webview never receives direct filesystem access; privileged operations belong in the Electrobun main process and are exposed through typed RPC.
- Source files are never overwritten by default.

## Commits

All commits must use the Conventional Commits format:

- `feat(cli): add preset loading`
- `fix(core): reject output collisions`
- `docs(docs): update installation guide`

The `pre-commit` hook formats staged source/configuration files with Oxfmt, stages any fixes, and then runs Oxlint on staged JavaScript/TypeScript files. The `commit-msg` hook validates commit messages with commitlint, and the `pre-push` hook runs `bun run check`. Lefthook is installed automatically by `bun install` through the root `prepare` script.
