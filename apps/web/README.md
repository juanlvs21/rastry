# Rastry web

The official static website for [rastry.juanl.dev](https://rastry.juanl.dev), built with Astro and Starlight. It contains the public landing page, typed documentation collections, operation/format/preset references, practical guides, release feed, and legal pages.

## Local development

From the repository root:

```bash
bun install
bun run dev:web
bun run typecheck:web
bun run build:web
```

The production output is `apps/web/dist/`. It is static HTML and assets; the package does not import Desktop, Electrobun, `@rastry/image-engine`, Bun.Image, or user filesystem APIs.

The web and desktop shells share the Rastry dark visual language: Nunito,
deep ink surfaces, warm ivory text, mandarin actions, indigo accents, and
forest success states. Light mode is intentionally disabled in both products.

## Content boundary

English is the only published language. Markdown in `src/content/` is validated at build time. The operation, format, and preset pages are backed by current contracts and example JSON files in the repository. The release page is generated from local Markdown entries aligned with `CHANGELOG.md`; it has no network or credential requirement.

## Vercel handoff

Set `apps/web` as the Vercel project root. The checked-in `vercel.json` documents Bun installation, `bun run build`, and `dist/` output settings. Domain activation, DNS, credentials, previews, and production deployment are intentionally separate hosting work.
