# Change 0003: Keep default exports beside the input

## Decision

When no output directory is provided, Rastry writes the result beside the input
and names it `{name}-rastry.{format}`. An explicitly selected output directory
keeps the existing format-aware names without the default suffix.

## Rationale

The default export should be easy to find without creating a separate
`rastry-output` folder, while the suffix preserves the no-overwrite guarantee.

## Verification

- Core planning tests cover the default directory and suffix.
- CLI dry-run tests cover the user-visible planned path.
