# Change 0009: Rastry brand palette and desktop logo assets

## Decision

Adopt the Rastry brand palette across the desktop webview: deep ink `#171923`, warm ivory `#F5F1E8`, indigo `#4B3F9F`, mandarin `#F26B3A`, slate `#687080`, and forest `#27866A` for success states. Use transparent SVG logo assets derived from the approved image-transformation mark as the production desktop brand resources.

## Impact

- The desktop topbar now renders the Rastry horizontal lockup instead of the placeholder `R` mark.
- The desktop favicon uses the standalone transparent Rastry mark.
- `rastry-logo-dark.svg`, `rastry-logo-light.svg`, `rastry-logo.svg`, and `rastry-mark.svg` live under the Vite-managed desktop asset directory.
- The generated PNG references remain available beside the SVG assets for future export work; the app uses the SVG variants for crisp scaling and reliable transparency.
- CSS tokens and component states now use the new palette while preserving distinct error and success semantics.
- A local `vite-env.d.ts` declaration keeps SVG and CSS imports type-safe in the desktop webview.
- The light lockup and standalone mark are also available at repository root for README hero usage.
