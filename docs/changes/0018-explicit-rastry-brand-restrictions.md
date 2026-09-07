# Change 0018: Explicit Rastry brand restrictions

- Status: Implemented
- Date: 2026-09-07
- Related records: [Change 0009](./0009-branding-and-logo-assets.md), [Change 0010](./0010-official-web-and-public-documentation.md)

## Context

The repository uses the Apache License 2.0 for its source code. Although the
standard trademark clause already withholds permission to use product names
and marks, the repository did not clearly explain that the Rastry name, logo,
and complete visual identity are separate from the code license.

## Change

Document an explicit brand restriction across the license, notice, README,
official license page, and product master documents. The source code remains
available for use, modification, and redistribution under Apache-2.0. The
Rastry name, word mark, logos, icons, domain names, color palette, typography,
layouts, and other visual identity elements are reserved and may not be used
to imply an official or affiliated derivative.

## Scope

- An explicit clarification in the Apache trademark section in `LICENSE`.
- A detailed Rastry trademark and visual identity notice in `NOTICE`.
- Repository and website license guidance in `README.md` and
  `apps/web/src/pages/license.astro`.
- Matching English and Spanish product-source documentation.

## Acceptance criteria

1. The license clearly distinguishes source-code permissions from Rastry brand
   restrictions.
2. The name, logo, and broader visual identity are explicitly listed.
3. Modified or redistributed works cannot use the brand to imply official
   status, affiliation, sponsorship, or endorsement.
4. The public license page links to the complete license and notice and states
   the same restriction.

## Consequences

Users can continue to fork, modify, and redistribute the code under Apache-2.0
while understanding that a derivative must use its own name and visual
identity, apart from accurate attribution and factual references.

## Alternatives considered

### Rely only on Apache's generic trademark clause

Rejected because it does not make the intended treatment of the Rastry brand
clear enough for repository users or derivative distributors.

### Restrict use of the source code

Rejected because the project remains open source under Apache-2.0.

## Implementation plan

1. Clarify the trademark section and add the detailed notice.
2. Update repository, website, and product documentation.
3. Run the web typecheck, formatting check, and tests.

## Verification

- `bun run typecheck:web`
- `bun run format:check`
- `bun test`
- Review the resulting diff for consistency across `LICENSE`, `NOTICE`, and
  the public license page.

## Follow-up

Any future permission to use the Rastry brand should be documented separately
and should not weaken the default restriction for forks and redistributions.
