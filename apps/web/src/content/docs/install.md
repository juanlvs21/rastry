---
title: Installation
description: Install Rastry CLI and Desktop from standalone release binaries.
slug: docs/install
---

Download the latest [Rastry release](https://github.com/juanlvs21/rastry/releases/latest).
Each release contains standalone binaries, so Bun is not required on the user's
machine.

## Install the CLI

Choose the archive for your operating system:

- Windows: rastry-windows-x64-cli.zip
- macOS: rastry-macos-cli.tar.gz
- Linux: rastry-linux-x64-cli.tar.gz

Extract the archive, place the rastry binary on PATH, and verify it:

    rastry --version
    rastry --help

## Install the Desktop app

- Windows: extract rastry-windows-x64-desktop-setup.zip and run Rastry-Setup.exe.
  Keep the extracted .installer folder beside Rastry-Setup.exe.
- macOS: open rastry-macos-desktop.dmg and drag Rastry to Applications.
- Linux: install rastry-linux-x64-desktop.deb with sudo apt install
  ./rastry-linux-x64-desktop.deb.

The CLI and Desktop app process images locally. No account, server, or Bun
runtime is required for released binaries.

## Develop the documentation site

The site is an independent static package for contributors. From the repository
root:

    bun --filter @rastry/web dev
    bun --filter @rastry/web typecheck
    bun --filter @rastry/web build

The production output is apps/web/dist/. It contains static HTML and assets and
does not need the CLI, Desktop runtime, an API, or image-processing services.

## Deployment handoff

Vercel can use apps/web as the project root with the checked-in vercel.json:
install with Bun, run bun run build, and serve dist/. DNS, credentials, and
custom-domain activation for rastry.juanl.dev are intentionally separate
follow-up work.
