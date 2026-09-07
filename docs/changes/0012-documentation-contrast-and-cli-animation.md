# Change 0012: Documentation contrast and CLI demo animation

- Status: Implemented
- Date: 2026-09-06
- Related records: [Change 0010](./0010-official-web-and-public-documentation.md), [Change 0011](./0011-shared-dark-visual-language.md)

## Context

The documentation shell still inherited Starlight's light-theme semantic
tokens for navigation surfaces and body text, leaving white areas and low
contrast copy even though the page declared dark mode. The home terminal card
was static, so it did not demonstrate the command-line workflow as clearly as
the rest of the product.

## Change

Pin Starlight's base and derived color tokens to Rastry's dark palette for
both theme attributes, including navigation, sidebar, body text, inline code,
and borders. Add an accessible home CLI demonstration that types the command,
shows an Enter cue, and reveals the dry-run output after submission.

## Scope

### Included

- Dark Starlight surfaces and readable documentation text.
- A typing, Enter, and output sequence for the home terminal example.
- Static content fallback and reduced-motion behavior for the demo.

### Not included

- Changes to the actual CLI, desktop workflow, RPC contracts, or image engine.
- User-configurable animation speed or repeated playback controls.

## Acceptance criteria

1. Documentation navigation and content surfaces contain no light-theme white
   backgrounds.
2. Documentation body text and code content meet the Rastry dark palette's
   readable contrast intent.
3. The home terminal repeatedly types a command, signals Enter, and reveals
   output in a continuous loop.
4. The full command and result remain available without JavaScript, and the
   animation is skipped when reduced motion is requested.
5. The terminal frame keeps the same height during every animation phase.
6. Web and repository checks continue to pass.

## Consequences

### Positive

- Documentation visually matches the dark desktop and landing experiences.
- The home page communicates the CLI workflow through a small, memorable
  interaction that remains alive while the page is open.
- Accessibility and no-script behavior remain intact.

### Negative

- The home page includes a small inline script and animation timing logic that
  continues while the user remains on the page.
- The documentation token mapping must be revisited if Starlight changes its
  semantic variable names.

## Alternatives considered

### Keep Starlight's system theme variables

Rejected because the product is intentionally dark-only and the derived light
tokens were the source of the visible contrast regression.

### Use a video or animated image for the CLI demo

Rejected because a semantic HTML terminal keeps the content selectable,
accessible, and independent of an additional media asset.

## Implementation plan

1. Map Starlight's base and derived semantic tokens to the Rastry dark palette.
2. Split the terminal command and output into controllable HTML regions.
3. Add a reduced-motion-aware inline typing sequence with a static fallback.
4. Run formatting, typecheck, build, lint, and tests.

## Verification

- `bun run typecheck:web` passes with zero errors, warnings, and hints.
- `bun run build:web` produces 38 static pages successfully.
- Generated CSS contains dark navigation/sidebar/background/text tokens.
- Generated home HTML contains the CLI demo, output region, and accessible
  summary.

## Follow-up

- Revisit replay controls only if user testing shows that one automatic demo is
  insufficient.
