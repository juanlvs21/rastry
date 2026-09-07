# Change 0016: Cross-platform release artifacts

- Status: Implemented
- Date: 2026-09-07

## Context

Rastry has a Bun CLI and an Electrobun Desktop application, but end users need
installable artifacts rather than the repository development commands. Releases
also need a repeatable path for publishing the CLI and Desktop outputs for each
supported operating system.

## Change

Add a tag-triggered GitHub Actions workflow that verifies the tagged source,
builds standalone CLI binaries and Desktop installers on Linux, macOS, and
Windows, creates a Debian package for Linux Desktop, and publishes the outputs
to a GitHub Release.

The public documentation now directs end users to release binaries. Changelog
and web release entries can be prepared deterministically with the
release:changelog script before creating a tag.

## Scope

- .github/workflows/release.yml and the Linux Debian packaging script.
- CLI version injection and Desktop version configuration.
- Root and web installation, quickstart, release, and download instructions.
- Electrobun generated artifacts in .gitignore.

## Acceptance criteria

- A vMAJOR.MINOR.PATCH tag push starts the release workflow.
- The workflow publishes Windows, macOS, and Linux CLI assets.
- The workflow publishes Windows, macOS, and Linux Desktop assets, including
  the Linux .deb.
- End-user documentation uses rastry binaries and does not require Bun.
- Generated Desktop artifacts remain untracked.

## Verification

- bun run typecheck
- bun run format:check
- Windows CLI compile with injected release version and rastry --version
- git diff --check
