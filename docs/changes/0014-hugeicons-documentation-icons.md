# Change 0014: Hugeicons for documentation navigation

Status: Superseded by Change 0015

## Context

The public documentation used Unicode arrows, checks, and terminal glyphs as visual cues. Those symbols were inconsistent across the home page, catalog pages, generated detail pages, and project links.

## Change

Use the official Hugeicons free icon definitions through a small Astro renderer. Replace decorative arrows and checks with inline SVG icons while keeping link text, keyboard accessibility, and the existing visual language intact.

## Scope

- The Astro web site layout, landing page, catalog pages, generated detail pages, release links, and project pages.
- The shared web stylesheet and the Hugeicons dependency.
- Documentation prose that previously used arrows to describe dependency direction.

## Acceptance criteria

- No documentation UI uses Unicode arrows, checks, or terminal symbols for navigation or status cues.
- Icons inherit the surrounding color, have decorative SVG semantics by default, and do not replace meaningful link text.
- The package and Bun lockfile remain synchronized.
- The web site builds successfully.

## Consequences

Documentation navigation has a more consistent visual vocabulary and a reusable icon component for future pages. The web package gains one dependency and a small static SVG renderer.

## Alternatives considered

- Keeping Unicode symbols: rejected because their rendering varies by font and platform.
- Adding a full icon framework or React renderer: rejected because the Astro site only needs static SVG output.
- Drawing bespoke SVGs in each page: rejected because it would duplicate markup and make visual consistency harder to maintain.

## Implementation plan

1. Add the Hugeicons free icon package and a typed HugeIcon Astro renderer.
2. Replace arrows, checks, and terminal glyphs across authored and generated web pages.
3. Add shared sizing and alignment styles for inline icons, cards, terminal output, safety items, and roadmap items.
4. Build and run repository checks.

## Verification

- Search the web source for the replaced Unicode symbols.
- bun run typecheck:web
- bun run build:web
- bun run check

## Follow-up

The implementation was replaced by the direct Lucide Astro package in Change 0015.
