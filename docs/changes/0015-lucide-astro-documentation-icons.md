# Change 0015: Direct Lucide Astro icons

Status: Implemented

## Context

Change 0014 introduced a custom Astro renderer around Hugeicons. The documentation only needs static SVG icon components, so the custom renderer added maintenance and markup work that a framework-native package already provides.

## Change

Replace the custom Hugeicons renderer and dependency with the @lucide/astro package. Import Lucide icons directly as Astro components while preserving the existing icon positions, sizing, colors, link text, and decorative accessibility behavior.

## Scope

- The Astro web package dependency and Bun lockfile.
- The shared site layout, landing page, catalogs, generated detail pages, release links, and project pages.
- The Change 0014 record, which is now superseded.

## Acceptance criteria

- No source page imports Hugeicons or the deleted custom renderer.
- Icons render through direct components from @lucide/astro.
- The package and Bun lockfile remain synchronized.
- The web site and repository checks pass.

## Consequences

The documentation uses a maintained, Astro-native icon package with typed props and tree-shakable imports. The site no longer owns icon path serialization or a local icon name registry.

## Alternatives considered

- Keeping the Hugeicons renderer: rejected because it duplicates SVG serialization and component behavior.
- Using a new local icon registry around Lucide: rejected because direct imports keep page dependencies explicit and use the package's tree-shaking model.

## Implementation plan

1. Replace the Hugeicons dependency with @lucide/astro.
2. Swap the custom icon elements for direct Lucide Astro components.
3. Remove the custom renderer and mark Change 0014 as superseded.
4. Run the web build and repository checks.

## Verification

- Search the web source for Hugeicons and custom renderer references.
- bun run typecheck:web
- bun run build:web
- bun run check

## Follow-up

Use direct imports from @lucide/astro for new documentation icons.
