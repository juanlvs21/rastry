# Change 0011: Shared dark visual language

- Status: Implemented
- Date: 2026-09-06
- Related records: [Change 0008](./0008-nunito-typography.md), [Change 0009](./0009-branding-and-logo-assets.md), [Change 0010](./0010-official-web-and-public-documentation.md)

## Context

The desktop shell already used Rastry's deep-ink palette, while the public web
shell still exposed a light paper theme and Starlight offered a system theme
selector. The products therefore looked like separate experiences and could
render different surfaces depending on the user's preference.

## Change

Unify the desktop and web surfaces around the same Rastry visual language:
Nunito typography, deep ink backgrounds, warm ivory text, mandarin actions,
indigo accents, and forest success states. Both products are now dark-only.
The web landing shell, Starlight docs, and desktop webview explicitly declare
dark color schemes; Starlight's theme provider and selector are overridden so
light mode cannot be selected or restored from an old preference.
The landing-only stylesheet stays isolated from Starlight's document shell, and
the landing terminal card keeps its privacy note in normal flow below the
example command output.

## Scope

### Included

- Dark semantic tokens for the web landing page and Starlight documentation.
- Shared palette alignment for desktop success states and native form controls.
- A fixed dark Starlight provider with no theme switcher.
- Documentation of the dark-only product direction.

### Not included

- A new component library or cross-runtime CSS package.
- Changes to workflow behavior, RPC contracts, image processing, or file safety.
- A light theme, automatic system theme switching, or user theme preferences.

## Acceptance criteria

1. The landing page and documentation render with dark surfaces and no light
   theme path.
2. The desktop webview declares and preserves a dark color scheme.
3. Both products use the same brand family for typography, surfaces, actions,
   accents, borders, and success states.
4. Starlight exposes no functional light-mode selector and ignores prior light
   mode persistence.
5. Documentation keeps Starlight's own typography and layout instead of
   inheriting landing-page hero rules.
6. The landing terminal example and privacy note do not overlap.
7. Web and repository checks continue to pass without changing product logic.

## Consequences

### Positive

- Desktop and web feel like one Rastry product.
- Dark mode is deterministic across operating systems and browser settings.
- Existing workflow behavior remains unchanged.

### Negative

- Users who prefer light mode cannot switch to it.
- Brand tokens are maintained in two runtime-specific CSS entry points.

## Alternatives considered

### Keep automatic system theming

Rejected because it would preserve the visual split and make screenshots,
documentation, and desktop support harder to reason about.

### Add a shared CSS package

Deferred because the current web and desktop bundlers have separate runtime
boundaries; duplicating a small token set keeps those boundaries explicit.

## Implementation plan

1. Remap the web semantic tokens and surfaces to the desktop dark palette.
2. Override Starlight's provider and selector to force dark mode.
3. Declare dark color schemes in the web shell and desktop webview.
4. Align desktop success colors and document the visual contract.
5. Run formatting, lint, typecheck, build, and tests.

## Verification

- `bun run check` passes with 45 tests and zero typecheck hints.
- `bun run build:web` produces the static web output successfully.
- Desktop and web source styles contain explicit dark color-scheme declarations.
- No workflow, RPC, image-engine, or filesystem behavior changed.

## Follow-up

- Revisit a light theme only as a separately scoped product decision.
