# Change 0010: Official web and public documentation

- Status: Implemented
- Date: 2026-09-05
- Related records: [Change 0003](./0003-complete-v0-1-image-operations.md), [Change 0005](./0005-cli-presets-and-declarative-pipelines.md), [Change 0006](./0006-release-quality-and-cross-platform-validation.md), [Change 0007](./0007-desktop-v0-2-typed-rpc.md), [Change 0009](./0009-branding-and-logo-assets.md)

## Context

Rastry now has a usable local image engine, a deterministic CLI with reusable
presets, release-quality checks, and a Desktop v0.2 workflow. The repository
contains product and contributor documentation, but `apps/web` is still only a
placeholder. There is no public landing page, structured documentation site,
blog, sitemap, or build process for the temporary domain `rastry.juanl.dev`.

This leaves the product difficult to discover and gives users no canonical
place to learn installation, operations, pipelines, presets, safety behavior,
or release compatibility. It also makes the product definition's web and SEO
requirements impossible to verify before the alpha.

This change establishes the independent static web application described in
`rastry.md`. The site will explain and document the CLI and desktop products
without importing application runtime code or coupling website deployment to
binary release artifacts. All image examples and processing claims must remain
local-first; the website must not upload user files or introduce telemetry by
default.

## Change

Turn `apps/web` into an Astro site with Starlight documentation and typed
content collections. Deliver an initial public site containing:

- a landing page covering the local-first promise, supported formats and
  operations, CLI and desktop workflows, downloads, roadmap, and GitHub CTA;
- documentation for installation, quickstart, CLI usage, operations, batches,
  pipelines, presets, configuration, troubleshooting, safety, and contribution;
- substantive guides for common web-asset workflows;
- structured pages for supported operations, formats, and shipped presets when
  each page has real examples and useful guidance;
- a changelog/release feed that reflects the repository's release information;
- license, local-first privacy, and trademark pages; and
- technical SEO primitives: canonical metadata, Open Graph/Twitter metadata,
  sitemap, robots policy, semantic internal links, RSS where applicable, and
  appropriate Schema.org data.

The site must produce fast static HTML with clean, stable URLs. English is the
initial published language; additional languages must not be advertised until
their content is complete enough to avoid partial translations.

## Scope

### Included

- An Astro + Starlight workspace package under `apps/web`.
- A reproducible Bun-based install, development server, typecheck, and static
  production build command.
- Typed content schemas for documentation, blog/guides, operations, formats,
  presets, and releases where the chosen Astro content model requires them.
- A responsive landing page using the Rastry brand assets and visual decisions
  already recorded for the product.
- Initial Starlight navigation and documentation content for the current CLI,
  Desktop v0.2 workflow, shared pipeline contract, supported operations,
  presets, dry-run behavior, output safety, and troubleshooting.
- Programmatic operation, format, preset, and guide pages only when backed by
  substantive content, examples, and internal links.
- Site-wide title, description, canonical URL, Open Graph, Twitter card,
  favicon, sitemap, robots.txt, and selected Schema.org metadata.
- A generated or maintained changelog page/feed aligned with `CHANGELOG.md`
  and the repository's release conventions.
- Accessibility basics: semantic headings, keyboard navigation, visible focus,
  useful link names, alt text, reduced-motion support, and readable contrast.
- Build-time link and content validation appropriate to the selected Astro
  integrations, with no network dependency for local content validation.
- Documentation for local development, preview, build output, deployment
  expectations, and the boundary between website content and application code.
- Vercel-compatible deployment configuration for the static site, including
  documented preview and production build settings for `rastry.juanl.dev`.

### Not included

- User accounts, comments, cloud image processing, file uploads, telemetry, or
  analytics enabled by default.
- A web version of the image engine or a browser-based image editor.
- Importing the desktop runtime, Bun.Image, or native Electrobun modules into
  the site bundle.
- Empty SEO pages generated only from keywords or unsupported operations and
  formats.
- Automatic multilingual translation, incomplete hreflang declarations, or a
  language selector without complete target content.
- A CMS, remote content API, or third-party database.
- DNS, domain registration, production credentials, or final custom-domain
  activation; Vercel is the selected deployment target for this increment, but
  account-owned configuration remains a follow-up.
- Desktop installers, release signing, update infrastructure, or watch mode.

## Acceptance criteria

1. `apps/web` is a valid Astro + Starlight package and can be installed,
   developed, typechecked, and built with the repository's Bun toolchain.
2. The production build emits static HTML and assets without requiring a
   running API, account, cloud image service, or application runtime.
3. The landing page clearly communicates what Rastry does, its local-first
   privacy model, supported formats, CLI/Desktop entry points, safety policy,
   current maturity, and links to installation and source code.
4. Documentation covers installation, quickstart, CLI reference, operations,
   batches, pipelines, presets, configuration, troubleshooting, safety,
   contribution, and the current Desktop workflow.
5. Every currently documented operation, format, and shipped preset has
   accurate examples and links to the relevant source or configuration when a
   substantive page is published; unsupported functionality is not presented
   as available.
6. URLs are clean and stable, navigation is coherent, and every public page
   has a unique title, description, canonical URL, and appropriate social
   metadata.
7. The build emits a sitemap and robots policy, includes useful structured data
   only where it matches the page content, and does not index previews,
   internal results, or low-quality duplicate pages.
8. The site exposes a release/changelog path that is consistent with the
   repository changelog and does not require network access or secrets to build
   from local content.
9. Keyboard navigation, semantic landmarks/headings, focus states, alt text,
   reduced-motion behavior, and color contrast are verified for the landing
   page and representative documentation pages.
10. Local image assets are optimized, fonts are intentionally limited, and
    representative pages meet the project's static-performance expectations
    without adding unnecessary client-side JavaScript.
11. The site has no direct dependency on `apps/desktop`, native modules,
    `@rastry/image-engine`, or user filesystem APIs at runtime.
12. `bun run check` and the web build pass without generated output, secrets,
    credentials, or unrelated files being committed.

## Consequences

### Positive

- Users get a canonical, searchable explanation of Rastry's workflows and
  safety guarantees before installing it.
- Documentation, examples, and releases become part of the product rather than
  remaining scattered across repository files.
- Static output keeps hosting simple, fast, and independent from image
  processing or desktop release lifecycles.
- Typed content collections and build-time validation make broken pages,
  missing metadata, and malformed content visible before publication.
- The site can grow into guides, operation references, and release notes
  without introducing a cloud processing dependency.

### Negative

- The repository gains a second frontend toolchain and another build surface to
  maintain.
- Product behavior and documentation can drift unless examples and release
  checks are kept close to the source of truth.
- SEO and accessibility metadata increase authoring and review requirements for
  every new page.
- A static site still requires a later decision about hosting, domain
  configuration, preview deployments, and publication ownership.

## Alternatives considered

### Keep documentation only in the repository README

Rejected because a single README cannot provide the navigation, search,
versioned guides, operation references, metadata, and structured URLs required
by `rastry.md`.

### Build a custom React documentation application

Rejected for the initial site because Starlight provides the documentation
navigation, accessible defaults, content organization, and static output that
Rastry needs without creating a second custom documentation framework.

### Use a remote CMS or documentation SaaS

Rejected because it adds credentials, operational dependency, and content
coupling to a product whose source and release process are currently local and
open source.

### Put the website inside the desktop application package

Rejected because the product definition explicitly keeps the web independent
from binary release artifacts and because native dependencies would make the
site harder to build and deploy.

### Generate every operation, format, and keyword page automatically

Rejected because empty or repetitive pages harm trust and search quality. Page
generation is limited to entries with substantive content and verified
examples.

### Add analytics and remote performance tooling immediately

Deferred because telemetry is opt-in by product policy. Static build checks and
local performance inspection are sufficient for the first public site; any
future measurement must be explicit, documented, and privacy-preserving.

## Implementation plan

1. Choose the Astro/Starlight package layout, supported Bun commands, content
   collection model, URL conventions, and a single initial language.
2. Add `apps/web/package.json`, Astro/Starlight configuration, TypeScript
   settings, shared layout metadata, favicon/brand assets, and static public
   files without importing desktop or image-engine runtime code.
3. Define content schemas and navigation for docs, guides, operations,
   formats, presets, releases, and legal pages. Add validation for required
   titles, descriptions, slugs, examples, and links.
4. Build the landing page around the approved Rastry visual identity and
   local-first messaging, with responsive and accessible sections for value,
   features, workflows, downloads, roadmap, and contribution.
5. Write the initial Starlight documentation from the current CLI, contracts,
   Desktop v0.2 behavior, supported operations, preset examples, dry-run
   policy, output safety, and troubleshooting behavior. Link to repository
   examples rather than copying unsupported claims.
6. Add substantive operation, format, preset, and guide pages using stable
   routes. Verify each page has useful instructions, examples, and related
   links before adding it to the sitemap.
7. Implement site-wide SEO metadata, canonical URLs, sitemap, robots policy,
   social cards, Schema.org data, RSS/release links, and deliberate indexing
   rules. Keep hreflang absent until a complete second language exists.
8. Add accessibility, link, content, and static-build checks. Review
   representative pages for semantic structure, focus behavior, reduced motion,
   contrast, asset weight, and unnecessary client-side JavaScript.
9. Document local development, preview, build, deployment handoff, and the
   boundary between repository content, releases, and the Vercel hosting setup
   for `rastry.juanl.dev`.
10. Run `bun run check` and the web build. Change this record to `Implemented`
    only after the acceptance criteria pass and hosting handoff requirements
    are explicitly recorded.

## Verification

- A clean Bun install can start the web development server and produce a
  static production build from `apps/web`.
- The built landing page and representative documentation pages contain
  semantic static HTML, unique metadata, canonical URLs, useful internal
  links, and optimized local assets.
- Starlight navigation reaches installation, CLI, operations, batches,
  pipelines, presets, Desktop, troubleshooting, contribution, legal, and
  release content without broken links.
- Content validation rejects missing required frontmatter, duplicate slugs,
  invalid operation/format references, and links to unavailable examples.
- Sitemap and robots output include only intended public pages; previews,
  internal results, and duplicate low-quality routes are excluded.
- A fixed local changelog/content source produces the same release page and
  feed output without network access or secrets.
- Keyboard-only navigation, focus visibility, heading order, alt text,
  contrast, reduced-motion behavior, and responsive layouts pass manual review
  on the landing page and representative docs.
- The web bundle contains no native Electrobun, Bun.Image, or user-file
  processing dependency and performs no upload or telemetry operation.
- `bun run check` and the web build pass, and generated directories remain
  ignored and absent from the committed change.

## Follow-up

- Complete the Vercel project connection, DNS, custom-domain activation, and
  deployment credentials for `rastry.juanl.dev` in a separate hosting change.
- Add complete Spanish documentation and explicit hreflang only when the
  translation workflow and maintenance ownership are ready.
- Add release automation that publishes the site alongside signed application
  artifacts after the desktop distribution policy is defined.
- Add practical guides and comparison pages based on real user questions and
  validated Rastry behavior rather than speculative SEO targets.
- Add privacy-preserving, opt-in performance measurement only if it is needed
  after the static site has real usage.
