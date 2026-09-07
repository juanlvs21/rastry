# Change 0008: Nunito typography

- Status: Implemented
- Date: 2026-09-05
- Related records: [Change 0007](./0007-desktop-v0-2-typed-rpc.md)

## Decision

Use Fontsource's variable Nunito font as the desktop application's global UI
font. The font is bundled through `@fontsource-variable/nunito`, so the
desktop application does not depend on network access at runtime.

## Impact

- All desktop UI text now uses Nunito, including the existing fractional and
  heavy font weights.
- No layout or component-specific typography rules were changed.
- The source is the self-hosted Fontsource Nunito package.
