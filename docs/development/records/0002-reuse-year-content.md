# 0002 — Reuse content from a previous year when creating a new Year

Date: 2026-10-19

## Assignment

When an admin creates a new Year, they previously had to rebuild everything from scratch: pages, homepage
steps, news, section types, program days, the registration form, and V2 email templates. The goal was to let
them optionally start a new Year from an existing one, picking which pieces to bring over, so repetitive setup
work for each year's event is not repeated from zero.

## Approach

- A new source-year picker (`components/forms/source-year-picker.tsx`) lets the admin choose a previous Year
  from the "create new Year" page; the choice is carried in the `?source=` URL search parameter, read on the
  server page (`app/admin/rocniky/novy/page.tsx`), so the page server-renders either the plain blank `YearForm`
  or the new reuse form depending on whether a source was picked.
- `getYearCopyInventory(sourceYearId)` (`lib/services/year-copy-inventory.ts`) is a React `cache()` service
  that loads a counted/flagged inventory of everything copyable from the chosen source year (pages, section
  types, homepage steps, news, program days, V2 email templates, registration-form presence, etc.), which
  feeds the new reuse form's per-category checklists.
- The reuse form (`components/forms/year-create-form.tsx`) lets the admin check which items to copy per
  category, disables conditional email templates automatically when the registration form itself is not being
  copied, and asks for an anchor date when the source year has none, serializing the whole selection to one
  hidden JSON field.
- The actual copy is done by a pure, transaction-scoped engine, `copyYearContent(tx, {...})` in
  `lib/utils/year-copy.ts`, which recreates the chosen rows under the new Year, remapping ids as it goes
  (old-id → new-id maps per entity) so that child rows (program events, form fields/conditions, pricing,
  email sections) point at the freshly created parents instead of the source year's rows. Dates on copied
  rows are re-anchored by a fixed millisecond delta (`computeDeltaMs` / `shiftDate`) computed from the
  source year's anchor date and the new year's anchor date, so weekday offsets and time-of-day are preserved
  instead of a naive "+1 year" shift.
    - Image URLs are copied as plain string references — the underlying files in Cloudflare R2 are **not**
      duplicated.
    - Publish state (`isPublished`) is carried over as-is from the source rows.
    - Only V2 email templates are copyable; the legacy Year-embedded email fields and the legacy
      `ConditionalEmail` model are intentionally excluded.
    - The registration form (fields, conditions/rules, pricing) is copied as one interdependent unit together
      with its capacity-limits sub-toggle — there is no way to copy only part of the form.
    - Conditional email templates are skipped (and reported back in `skippedConditionalTemplateIds` /
      `skippedConditionalSectionIds`) whenever the registration form itself was not selected for copying, since
      they depend on form conditions that would otherwise dangle.
- A new server action, `createYearWithReuse` (`lib/actions/years.ts`), validates the request with
  `createYearWithReuseSchema` / `yearCopySelectionSchema` (`lib/validators/year.ts`), creates the new Year and
  runs `copyYearContent` inside one `db.$transaction` (raised `timeout: 30000` to accommodate the amount of
  work), and reuses the existing `createDefaultPages` helper for any default pages not covered by the copy.
  `createDefaultPages` was refactored to accept an optional Prisma client/transaction-client parameter
  (defaulting to the shared `db` client) so it can run either standalone or inside the new transaction.

## Key decisions

- Re-anchor dates by a fixed delta rather than a naive year-increment, so multi-day events and weekday-specific
  program days keep their real offsets from the new anchor date.
- Never duplicate R2-hosted images on copy — copied rows simply reuse the same URL string as the source, since
  the underlying files are event-wide, slow-changing assets rather than per-year data.
- Keep V2 as the only copy source for email templates; legacy embedded Year email fields and the legacy
  `ConditionalEmail` model were deliberately left out of scope.
- Treat the registration form (and its capacity-limits sub-toggle) as one indivisible unit to copy, since its
  fields/conditions/pricing are tightly interdependent and a partial copy would be meaningless or broken.

## Outcome & deviations

No new npm dependencies, no new npm scripts, and no Prisma schema changes were required — the feature builds
entirely on the existing Year/Page/Section/Program/Registration/V2-email data model plus one new service, one
new pure util module, one new server action, one new validator module, and three new/changed UI files. This is
a documentation-only follow-up pass (no code changes); `npm run lint` / `npm run build` were not re-run as part
of this pass.

## Update (2026-10-21) — unified form, photos no longer transferable

The create-year UI described in **Approach** was reworked before landing; the copy engine
(`copyYearContent` in `lib/utils/year-copy.ts`) and the **Key decisions** above are unchanged. Changes:

- **Photos are no longer transferable between years.** The earlier "Převzít foto záhlaví" / "Převzít hlavní
  foto" copy checkboxes and the `copyHeaderPhoto` / `copyHeroPhoto` mechanism were removed. Each new Year now
  always gets its own `headerPhoto` / `heroPhoto`, uploaded manually via `ImageUploader` — even in the
  copy-from-year path. (Image-URL copying _within_ copied entities, e.g. news `coverImage` and program
  `imageUrl`, is a separate thing and still happens as described above.)
- **One unified form.** `components/forms/source-year-picker.tsx` and `components/forms/year-create-form.tsx`
  were deleted and replaced by a single client component `components/forms/year-new-form.tsx` (`YearNewForm`).
  The old `?source=` URL-searchParam server branch in `app/admin/rocniky/novy/page.tsx` is gone; the page is
  now a thin server component that only loads the year list and renders `YearNewForm`.
- **On-demand, no-reload inventory.** The source Year is chosen via a client `Select` whose `onChange` calls a
  new server action `loadYearCopyInventory(sourceYearId)` (`lib/actions/years.ts`) to fetch the copy-inventory
  into client state — no page reload, so already-typed fields and uploaded photos persist. The
  content-selection subsection (`ReuseSection`, inside `year-new-form.tsx`) is keyed by `sourceYearId` so
  switching source resets only the selection, not identity/photos.
- **Single submit action.** `createYearWithReuse` is no longer exported; `createYear` is now the single entry
  point and branches on whether `sourceYearId` is present (blank create vs copy-from-year). The reuse branch
  persists the manually-uploaded photos rather than the source year's. `createYearWithReuseSchema`
  (`lib/validators/year.ts`) dropped the `copyHeaderPhoto` / `copyHeroPhoto` booleans and gained
  `headerPhoto` / `heroPhoto` string fields.

Verified: `npx tsc --noEmit` and `npx eslint app components lib` clean; the route loads (auth-redirects)
without server error. Live authenticated walkthrough left to manual testing.

## Update (2026-10-21b) — required dates, section-block copy, legacy Pages dropped, E2E tests

- **Start + end date required.** `createYearSchema` and `createYearWithReuseSchema` require `startDate` /
  `endDate`. The form carries `noValidate` on the `<form>` so submission is never silently blocked by the MUI
  date pickers' hidden `required` inputs; server-side Zod returns the field errors, which render as helper text.
  (A prior version set `required` on the pickers without `noValidate`, which made Chrome silently refuse to
  submit when a date was empty — fixed.)
- **Copy is now section-block level, with the parent page auto-copied.** In this app a public page is a
  `SectionType` (slug + "Nastavení veřejné stránky") whose content is `Section` blocks. The copy dialog's
  "Sekce" area now lists each `SectionType` as an accordion of its individual `Section` blocks; ticking blocks
  copies the parent `SectionType` **once** (its slug/pageTitle/etc.) with **only the selected blocks**
  attached. Selection changed from `pageIds` / `sectionTypeIds` to a single `sectionIds: string[]`
  (`yearCopySelectionSchema`, `YearCopySelection`); the engine's `copySections` groups selected blocks by
  parent type. `YearCopyInventory.sectionTypes[]` now includes `sections: { id, title }[]`.
- **Legacy `Page` ("Stránky") removed from copy.** The standalone `Page` model has no admin list surface and
  is not rendered for the active year (only via the archive route), so copying it produced invisible rows. The
  "Stránky" category and `pageIds` were removed from the copy dialog/selection. The `Page` model itself and
  `createDefaultPages` (still seeds default pages on every new year, blank or copied) are untouched.
- **E2E tests added** (`tests/year-copy.spec.ts`, `playwright.config.ts`, `tests/helpers/`): copies one
  selected section block (asserts parent type + exactly that block), required-date regression guard, and
  photos-not-copied. Self-cleaning (reserved years 2094–2096, deleted before/after). `npm run test:e2e`.

Verified: `npx tsc --noEmit`, `npx eslint app components lib`, and `npx playwright test` (3 passed) all green.
