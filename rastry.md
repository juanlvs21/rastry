# Rastry

> A local-first, open-source tool for optimizing and transforming images.

**Product master document**

Domain: **rastry.dev** · License: **Apache-2.0** · Status: **Product definition**

The Spanish translation is available in [rastry-es.md](./rastry-es.md).

## Executive summary

Rastry is a local-first tool for optimizing, transforming, and organizing images in batches through reproducible operations. It will be available as both a CLI and a desktop application, built on a shared TypeScript engine that uses Bun.Image. It requires no accounts, uploads no files, and does not depend on a cloud service to do its work.

The first version prioritizes a safe and useful experience for developers, designers, and web teams: converting PNG/JPEG/WebP, reducing file size, resizing, cropping, adding padding, removing metadata, and processing batches. Configurations can be saved as reusable presets and pipelines.

## Product decision

| Principle     | Decision                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------- |
| Privacy       | All processing happens locally; images are never uploaded and no account is required.         |
| Architecture  | A TypeScript engine built on Bun.Image; the CLI and desktop app invoke the same domain rules. |
| Safety        | Originals are never overwritten by default. Outputs go to an explicit or derived directory.   |
| Initial scope | Do not include background removal, OCR, AVIF, or screenshot capture in v0.1.                  |
| Distribution  | Monorepo, installable releases, and official documentation at rastry.dev.                     |

## 1. Vision, users, and value proposition

### Vision

Turn image optimization into a local, fast, and repeatable task: as convenient as dragging a folder into a desktop app and as easy to automate from a terminal or development pipeline.

### Priority users

- Web developers who need to optimize assets before publishing.

- Designers and creators who prepare image batches without handing files to a third party.

- Small teams that want consistent presets for the web, e-commerce, social media, or documentation.

- Power users and automation agents that require a clear and predictable CLI.

### Value proposition

| Need                | Rastry's response                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Privacy and control | 100% local processing; files stay on the user's device.                                               |
| Repeatable results  | Pipelines and presets express a transformation as version-controlled configuration.                   |
| Simple usage        | A GUI for visual tasks and a CLI for scripts, CI, and agents.                                         |
| Safe operation      | Dry-run, plan preview, and an explicit no-overwrite policy.                                           |
| Sustainable project | Open source with a future monetization path based on convenience, not on locking away basic features. |

## 2. Functional scope

### MVP: input and output formats

- Input: PNG, JPEG, and WebP.

- Output: PNG, JPEG, and WebP.

- Encoding options: JPEG/WebP quality, transparency preservation when supported by the format, and metadata removal.

### MVP: operations

| Operation           | Expected behavior                                                       |
| ------------------- | ----------------------------------------------------------------------- |
| Proportional resize | Limits width and/or height while preserving the aspect ratio.           |
| Exact resize        | Produces defined dimensions; the fitting policy is declared explicitly. |
| Crop                | Crops by area or anchor; ready for visual exposure in the desktop app.  |
| Transparent trim    | Removes unnecessary transparent borders from compatible images.         |
| Padding             | Adds space around the image with a configurable color/background.       |
| Conversion          | Converts between PNG, JPEG, and WebP.                                   |
| Compression         | Applies quality and output parameters to reduce file size.              |
| Metadata removal    | Removes EXIF and unnecessary metadata from outputs.                     |
| Batch               | Applies the same configuration to multiple files and folders.           |

### Out of scope for v0.1

Deliberately out of scope: background removal, OCR, AVIF, screenshot generation, cloud sync, accounts, real-time collaboration, and a plugin system. This constraint protects delivery speed and avoids introducing models, large binaries, or local inference before the core utility has been validated.

## 3. User experience and safety guarantees

### CLI as a first-class citizen

The CLI must be readable, scriptable, and stable. Examples of the intended direction:

```text
rastry photo.png --to webp

rastry photo.png --to webp --quality 82 --max-width 1600

rastry ./assets --to webp --quality 80 --output ./optimized

rastry run ./public --preset web
```

### Batches, pipelines, and presets

- A batch processes a selection of files or a folder, with format filtering and a final summary.

- A pipeline is a declarative sequence of operations; for example, trim → resize → convert to WebP → remove metadata.

- A preset is a named, reusable pipeline initially stored locally as a readable configuration file.

- Presets can be invoked from both the GUI and the CLI; behavior must be identical.

### Dry-run and no overwrites

By default, Rastry never modifies an original. Output is written to a directory specified by the user or to a derived directory such as `./rastry-output`. If a name conflicts, the tool fails with a clear message or uses an explicit suffixing strategy; it never silently replaces a file.

- `--dry-run` shows affected files, operations, the estimated output path, and possible conflicts without writing anything.

- If an overwrite option is offered, it must be explicit and difficult to activate accidentally.

- The desktop app must show a plan preview before executing a batch.

- Every run provides a summary: processed, skipped, failed, size before/after, and output location.

## 4. Technical architecture

The architectural rule is simple: neither the interface nor the CLI transforms images directly. Both invoke the same TypeScript domain engine. Bun.Image performs local processing; Electrobun provides the Bun runtime, desktop layer, and secure RPC bridge between the interface and the main process. This reduces divergence, enables strong testing, and keeps the door open for future integrations.

| Layer                        | Responsibility                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Core · TypeScript            | Pipelines, validation, planning, output paths, dry-run, metrics, and domain errors; no UI dependency.           |
| Image Engine · Bun.Image     | Decoding/encoding, resize, crop, trim, padding, conversion, quality, and local result writes.                   |
| CLI · Bun                    | Argument parsing, preset loading, result presentation, exit codes, and standalone binary compilation.           |
| Desktop · Electrobun + React | React interface in a WebView; Bun main process; windows, dialogs, menus, and typed RPC for invoking the engine. |
| Configuration                | Shared pipeline/preset schema; local serialization, version validation, and future migrations.                  |
| Web                          | Static landing page, documentation, and blog, independent of the binary and published at rastry.dev.            |

### Implementation principles

- Deterministic, testable core without UI dependencies.

- Pipelines are validated before files are processed.

- Batch errors are isolated per file; one failure does not hide the results of the others.

- The interface has no direct filesystem access; it uses typed RPC to the main process.

- Bun.Image uses limits such as `maxPixels` and stable errors to protect processing.

- Telemetry is disabled by default; if it ever exists, it must be opt-in and transparent.

## 5. Proposed monorepo structure

A single repository keeps the core, adapters, and web experience aligned without forcing the site to depend on the application's release cycle.

```text
rastry/
apps/
cli/ # rastry command: Bun --compile
desktop/ # Electrobun + React
web/ # Astro: landing page, docs, and blog
packages/
core/ # pipelines, dry-run, validation, and output paths
image-engine/ # Bun.Image adapter
contracts/ # shared types and schemas
docs/ # ADRs, contribution guides, and decisions
examples/ # presets and use cases
scripts/ # release, generation, and verification
.github/ # CI, issues, PR templates, and releases
LICENSE # Apache-2.0
README.md
```

## 6. Official web: landing page, documentation, and SEO

### Web stack

The website lives in `apps/web` within the monorepo and uses Astro as its static framework, Starlight for documentation, and Content Collections for typed content (docs, blog, presets, operations, and comparisons). This combination supports performance, maintainability, and a predictable SEO structure.

### Content architecture

| Area                      | Goal and content                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing page              | What Rastry is, local-first privacy, features, CLI examples, downloads, roadmap, and a CTA to GitHub.                                        |
| Documentation             | Installation, quickstart, CLI reference, operations, batches, pipelines, presets, configuration, troubleshooting, and contribution.          |
| Blog                      | Practical guides and product notes: web optimization, PNG vs. JPEG vs. WebP, workflows, and releases.                                        |
| Useful programmatic pages | One page per operation, format, preset, and use case; all with real examples and internal links. Do not create empty keyword-targeted pages. |
| Changelog                 | Version changes, compatibility, and migration notes.                                                                                         |
| Legal                     | License, local-first privacy policy, and trademark notice.                                                                                   |

### Non-negotiable technical SEO

- Fast static HTML, clean URLs, `sitemap.xml`, `robots.txt`, and canonical URLs.

- Unique metadata per page: title, description, Open Graph, and Twitter cards.

- Schema.org where it adds value: SoftwareApplication, TechArticle, FAQPage, and BreadcrumbList.

- Use hreflang when multilingual content is published; start consistently with Spanish or English rather than incomplete translations.

- Optimized web images, minimal fonts, Core Web Vitals as a product metric, and semantic internal links.

- Blog RSS, a release feed, and visible download/version data for indexing.

- Do not index internal results, previews, or low-quality pages.

### Initial programmatic pages

- `/docs/operations/resize`, `/crop`, `/trim`, `/padding`, `/convert`, and `/strip-metadata`.

- `/docs/formats/png`, `/jpeg`, and `/webp`.

- `/presets/web`, `/ecommerce`, and `/social` (only when each preset has substantive instructions and configuration).

- `/guides/optimize-images-for-web`, `/convert-png-to-webp`, and `/batch-resize-images`.

## 7. Product roadmap

| Version            | Goal                                               | Main features                                                                                                                                              | Exit criterion                                                                     |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| v0.1 · Foundations | Solve the core use case safely.                    | TypeScript core; Bun.Image; compiled Bun CLI; PNG/JPEG/WebP; resize, crop, trim, padding, conversion, quality, metadata, batch, dry-run, and safe outputs. | A real batch can run without overwriting originals and with reproducible results.  |
| v0.2 · Desktop     | Make the engine accessible to non-technical users. | Electrobun + React; Bun main process; file selection/drag and drop; operation form; plan preview; progress and summary through RPC.                        | GUI and CLI produce equivalent results with the same configuration.                |
| v0.3 · Reuse       | Turn repeated tasks into savable workflows.        | Declarative pipelines; local presets; import/export; basic execution history; recipe documentation.                                                        | A preset can be shared and invoked reliably from the CLI and desktop app.          |
| v0.4 · Integration | Mature automation and distribution.                | Initial watch mode; installers and releases; updates/migration documentation; performance improvements and optional local observability.                   | Watch mode is explicit, safe against loops, and preserves the no-overwrite policy. |

### Note on watch mode

Watch mode is reserved for v0.4 because it requires careful design: watched folders, output-directory exclusion, event deduplication, file stability before processing, a retry queue, and a clear log. It must be an explicit and reversible mode, never a silent automation.

## 8. Phased action plan

1. Repository definition and foundation: create the Bun monorepo, establish Apache-2.0, add the README, CONTRIBUTING, Code of Conduct, initial ADR, and pipeline configuration schema.

2. Bun/Electrobun technical spike: verify PNG/JPEG/WebP, critical operations, batches with progress/cancellation, and builds on Windows, macOS, and Linux before locking the stack.

3. Core and CLI v0.1: implement operations with Bun.Image, unit tests, and fixtures; define the execution plan, dry-run, output paths, and batch summary.

4. Release quality: add CI for tests and linting, CLI builds, format compatibility tests, and changelog generation.

5. Web from the beginning: build the landing page, Starlight documentation, CLI reference, and first SEO guides; publish at rastry.dev before or alongside the alpha.

6. Closed alpha: validate with real web-asset workflows; collect issues involving safety, naming, performance, and ergonomics.

7. Desktop v0.2: integrate Electrobun + React over typed RPC to the Bun process; verify parity with the CLI and complete onboarding.

8. Pipelines/presets v0.3 and watch mode v0.4: move forward only when recurring use cases and core stability justify it.

## 9. Metrics and success criteria

| Area         | Initial success criterion                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Utility      | A user can optimize a web-asset folder with one command or visual workflow without editing originals.       |
| Reliability  | Deterministic results, actionable error messages, and strong coverage of critical operations.               |
| Performance  | Competitive processing for common batches, without blocking the interface and with understandable progress. |
| OSS adoption | Well-triaged issues, reproducible examples, external contributions, and regular releases.                   |
| Web/SEO      | Useful, indexable documentation that attracts practical-intent searches, not just branded traffic.          |
| Trust        | The local-first promise is clear in under a minute and the file policy prevents accidental loss.            |

## 10. Open-source model and future monetization

### License: Apache-2.0

Rastry will be released under the Apache License 2.0. It is a permissive license compatible with commercial use and enterprise contributions, and it includes an explicit patent grant. The repository should include `LICENSE`, `NOTICE` when applicable, copyright headers where appropriate, and a clear contribution policy.

### Monetization principle

Core functionality will remain open: CLI, desktop app, conversion, compression, batches, pipelines, and presets. If the project eventually monetizes, users will pay for convenience, support, or distribution—not to regain access to basic capabilities.

| Potential path             | What it could offer                                                                         | When to consider it                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Sponsors                   | GitHub Sponsors, OpenCollective, and corporate sponsors.                                    | From the first users; does not alter the product.                    |
| Official paid distribution | Signed installers, automatic updates, certified builds, and system integrations.            | After stable releases and clear demand for convenience.              |
| Advanced automation Pro    | Complex rules, preset collections, advanced history/management, or enterprise integrations. | Only if it is clearly additive; not before validating the open core. |
| Enterprise services        | Support, CI/CD integration, custom processor development, or internal deployments.          | When teams adopt the project and recurring needs emerge.             |

## 11. Why Rastry

Rastry comes from raster, the type of image the tool processes. The name keeps that technical association without feeling rigid; it is short, memorable, and pronounceable in both Spanish and English. The “-y” ending gives it a warmer, more distinctive product identity, while rastry.dev clearly communicates its place: a tool for people who build, optimize, and automate. The rastry.dev domain is also available under the current decision, allowing the name, project, and documentation to align under one brand.

## 12. Decisions to keep explicit

- Rastry is local-first and requires no account.

- The TypeScript core and Bun.Image are the single source of truth for transformations.

- The compiled Bun CLI and Electrobun desktop app have behavioral parity.

- Originals are never overwritten by default.

- v0.1 remains deliberately small and complete.

- The web, documentation, and SEO are part of the product from day one.

- Apache-2.0 enables broad adoption while preserving a sustainable convenience-based monetization path.

## Appendix A. Concrete next decisions

- Confirm the CLI name (`rastry`) and the Bun monorepo packages.

- Run the Bun.Image + Electrobun spike: compatibility, performance, progress, cancellation, and builds on three platforms.

- Define the initial preset format (for example, YAML or JSON) and publish a versioned schema.

- Create the first three example presets: web, e-commerce, and social.

- Draft the initial README and publish the first “coming soon” landing page/documentation.
