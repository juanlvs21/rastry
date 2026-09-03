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

## Release readiness

Before proposing a release candidate, run the same checks used by CI from a
clean working tree:

```bash
bun install --frozen-lockfile
bun run check
bun run build:cli
bun run changelog -- --from <previous-release> --to HEAD
```

The compiled CLI is written to `apps/cli/dist/rastry` on Unix-like runners and
`apps/cli/dist/rastry.exe` on Windows. Pull requests and pushes to `main` run
the check and build matrix on Linux, macOS, and Windows. Each job uploads only
its platform-specific compiled CLI as a seven-day inspection artifact.

The changelog command reads local Git history and requires no network access or
secrets. Use `--write` to update `CHANGELOG.md`; preserve its stable
`[Unreleased]` section when moving entries into a dated release. CI validates
the CLI foundation and local image behavior only; desktop installers,
signing, notarization, auto-updates, and public distribution remain future
release work.
