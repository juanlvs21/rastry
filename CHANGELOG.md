# Changelog

All notable changes to Rastry are documented here. Generate a deterministic
unreleased section from Conventional Commits with `bun run changelog`.

## [Unreleased]

No changes recorded after the v0.0.1 foundation baseline.

## [0.0.1] - 2026-09-02

### Features

- `feat(cli)`: add declarative presets ([a5e01fc])
- `feat(core)`: add deterministic preflight and batch execution ([bb1bd3a])
- `feat(image-engine)`: complete v0.1 image operations ([19f19a4])
- `feat(image-engine)`: apply shared image adapter architecture ([e68882d])
- `feat(core)`: implement safe planning and dry-run ([b339617])

### Fixes

- `fix(types)`: support TypeScript 7 configuration ([c6a2876])

### Documentation

- `docs(docs)`: unify change records ([f318c92])
- `docs(docs)`: explain Rastry motivation ([8b98107])
- `docs(docs)`: make English the project language ([8a9cc4b])

### Maintenance

- `chore(cli)`: ignore generated optimized output ([7e4dcc5])
- `chore(deps)`: configure Oxlint and Oxfmt hooks ([a8dbc4f])
- `chore(docs)`: remove docs directory ([f50f509])
- `chore(deps)`: enforce Conventional Commits with Lefthook ([0de1b07])
- `chore(deps)`: pin desktop dependency versions ([0c21e0e])
- `chore`: initialize repository ([19e09c8])

## Generating future entries

The changelog command reads local Git history only, skips merge commits, and
groups Conventional Commit subjects deterministically. Generate a fixed range
without network access or credentials:

```bash
bun run changelog -- --from <previous-release> --to HEAD
```

Keep the generated `[Unreleased]` section until the next release baseline is
cut, then move it under a dated version heading and leave `[Unreleased]` in
place for subsequent changes. `--write` updates the root `CHANGELOG.md` with
the generated section.
