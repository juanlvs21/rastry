# Change 0017: Simplified landing page calls to action

- Status: Implemented
- Date: 2026-09-07
- Related records: [Change 0010](./0010-official-web-and-public-documentation.md), [Change 0016](./0016-cross-platform-release-artifacts.md)

## Context

The landing page hero exposed three actions: a verbose quickstart label, a
verbose release-download label, and a separate source link. The primary entry
points were more prominent than necessary for the focused landing-page flow.

## Change

Simplify the hero actions to two buttons: `Quickstart` linking to the
quickstart documentation and `Download` linking to the latest GitHub release.
Remove the redundant hero-only `View source` button while keeping repository
links elsewhere on the page.

## Scope

- `apps/web/src/pages/index.astro` hero button labels and actions.
- This change record and the change-record index.

## Acceptance criteria

- The hero shows exactly two primary actions.
- Their visible labels are `Quickstart` and `Download`.
- The existing quickstart and latest-release destinations remain unchanged.
- Other repository links on the page remain available.

## Consequences

The hero has a clearer visual hierarchy and fewer competing actions. Users who
want the source can still reach the repository through the header or lower
page GitHub links.

## Alternatives considered

### Keep the source button in the hero

Rejected because the request favors a focused pair of primary actions and the
page already provides repository links elsewhere.

### Keep the longer labels

Rejected because `Quickstart` and `Download` communicate the same destinations
with less visual weight.

## Implementation plan

1. Update the hero labels and remove the redundant source action.
2. Verify the web app typechecks and builds successfully.
3. Confirm the generated homepage contains only the two requested hero labels.

## Verification

- `bun run typecheck:web`
- `bun run build:web`
- `git diff -- apps/web/src/pages/index.astro`
- Generated `apps/web/dist/index.html` contains `Quickstart` and `Download` in
  the hero and no `View source` action there.

## Follow-up

No follow-up is required unless the landing page gains a dedicated source or
contribution call to action in a future design pass.
