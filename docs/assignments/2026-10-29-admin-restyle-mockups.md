# Assignment: Restyle admin UI to the `mockups/admin/` design

## 1. Title

Apply the builder-palette visual design from `mockups/admin/` across the entire admin area (content + chrome).

## 2. Type

**change-request** — change the current admin visual design to the target look defined by the mockups. Strong behavior-preservation constraint (restyle-only; no feature/behavior change).

## 3. Summary / Context

The admin area is visually inconsistent: a few screens already carry the builder-palette look (galerie list `album-list.tsx`, `album-actions.tsx`, sekce `section-types-list.tsx`), while most remain default plain-MUI blue. A complete set of reference mockups now exists in `mockups/admin/` (53 screens + `index.html` map, shared `_shared.css`), covering every admin screen in the target builder-palette design. The written design contract is `.claude/rules/admin-ui-design.md`; the palette/helpers are `builderPalette` (`components/admin/email-builder/palette`), `builderFieldSx` (`components/admin/builder-field-sx.ts`), and `DashedAddButton` (`components/admin/dashed-add-button.tsx`).

This assignment specifies restyling **all** admin screens — and, per decision, **the chrome too** (left drawer, top appbar, breadcrumbs) — to match the mockups, with zero change to what any screen does. It supersedes the previous content-only, page-by-page rollout by defining the whole target at once; implementation may still proceed in phases.

**Why:** one coherent admin product; remove the half-restyled inconsistency; make `mockups/admin/` the canonical visual reference.

## 4. Scope

**In scope**

- Every admin screen under `app/admin/**` (all ~53 in `mockups/admin/index.html`): global (dashboard, ročníky, novinky, galerie, účastníci, uživatelé, login, nastavení/gdpr/emaily/banka) and year-scoped (přehled, obsah, úvod, program, sekce, stránky, registrace + formulář/náhled/přihlášky/detail/transakce/účast/success-page, emaily + templates/podmíněný/hromadné, nastavení).
- Admin content components (`components/admin/**`) and admin forms (`components/forms/**`).
- **Chrome:** left drawer (`admin-drawer.tsx`, `year-sidebar.tsx`), top appbar + breadcrumbs (`admin-app-bar.tsx`, `page-header.tsx`), layout (`admin-layout.tsx`) — restyled to the builder palette per the mockups (drawer) and derived-from-palette (appbar, which has no mockup).
- Re-aligning already-partially-restyled screens (galerie, sekce, album-actions) to the mockups where they diverge.
- Updating `.claude/rules/admin-ui-design.md` (§6 no longer "don't touch chrome") and pointing it at `mockups/admin/` as canonical.

**Out of scope**

- Public-facing pages/components (separate `publicTheme`), and the public theme itself.
- Any behavior, feature, data, validation, auth, server-action, or routing change.
- Dark mode (mockups are light-only).
- The mockup files themselves (reference input, not a deliverable to change).
- New features, columns, controls, or states not already in the real components.

## 5. Requirements

**Design system**

1. All content-layer color/shape/spacing MUST come from `builderPalette` tokens via MUI `sx` — no raw hex, no `style={}`, no `className` for color (per `admin-ui-design.md §4.1`).
2. Shared inputs (TextField, Select, Autocomplete, pickers, wrapping FormControl) MUST use `builderFieldSx`; create/add affordances MUST use the dashed treatment (`DashedAddButton` or matching `sx`).
3. Component patterns (pane, count pill, buttons, icon buttons, chips/badges, tables, cards/grids, blocks/canvas, dialogs, tabs, empty states, stat tiles) MUST follow the patterns in `admin-ui-design.md §3` and the mockups.
4. Reuse existing restyled references (`section-types-list.tsx` as the implementation exemplar) before writing new styling; reuse existing shared components over rebuilding.

**Chrome**

5. The left drawer (default + year-scoped) MUST match the drawer in the mockups: builder-palette surface, indigo active state with left accent bar, section dividers, restyled user footer — while preserving the exact menu structure, order, indentation, icons, dividers, role-gating, active-year injection, and the year-sidebar dynamic conditional-email items.
6. The top appbar + breadcrumbs MUST be restyled consistently with the drawer using `builderPalette` tokens (no mockup exists for the appbar; derive it from the palette), preserving the breadcrumb mechanism (`PageHeader` context), the Dashboard home crumb, the page title, the mobile hamburger, and all current links.

**Behavior preservation (restyle-only)**

7. Every screen MUST preserve 100% of its current features: all columns, filters, chips, buttons (exact Czech labels), fields, dialogs, toggles, tabs, counts, sorts, empty states, tooltips, status badges and their states, role-gated/read-only (EDITOR) variants, mode variants (draft vs sending, view vs edit), and special indicators — including the under-18 amber left-border, TEST chip, payment/email indicator icons, current-user row highlight, and distinct-year participant chips.
8. No feature, column, control, badge, or state may be added that is not already present. Where a mockup shows more or less than the real component, the real component wins on features; implementers MUST flag the diff and NOT change feature scope.
9. All Czech UI text, option labels, and element placement MUST remain unchanged (incl. existing non-diacritic strings where the code has them, and "hromadný email" / never "kampaň").
10. Blanket `sx` overrides MUST NOT clobber intentional per-cell styling (e.g. use `borderBottomColor`, not `borderColor`, so a warning left-border survives).

**Engineering**

11. Server/Client component boundaries MUST be preserved; add `"use client"` only where already required. MUI `ButtonBase`/`Button` with `component={Link}` MUST NOT be passed from a Server Component (use the `DashedAddButton`/`LinkButton` pattern).
12. Every icon-only control MUST keep a `Tooltip`/`aria-label`; the indigo focus-visible ring MUST be intact; layout MUST remain responsive (drawer collapses, no horizontal page scroll at phone width).

**Docs**

13. `.claude/rules/admin-ui-design.md` MUST be updated: §6 revised to reflect that chrome (drawer + appbar) is now in scope and restyled; `mockups/admin/` (and `index.html`) referenced as the canonical visual reference; `components.md` updated for any shared component whose signature/purpose changes.

## 6. Acceptance Criteria

**Checklist (review)**

- [ ] No admin screen renders default plain-MUI blue content; all content uses `builderPalette` via `sx`.
- [ ] `grep` finds no raw hex / `style={}` color / color `className` in touched `app/admin/**`, `components/admin/**`, `components/forms/**`.
- [ ] Inputs use `builderFieldSx`; every "Přidat…/Nové…" action is dashed.
- [ ] Drawer (default + year) visually matches the mockups and keeps identical menu items, order, indentation, icons, role-gating, active-year + conditional-email behavior.
- [ ] Appbar + breadcrumbs restyled from palette, consistent with the drawer; breadcrumb trail, page title, mobile hamburger unchanged.
- [ ] Each admin screen visually matches its counterpart in `mockups/admin/` (reviewer compares against the slug).
- [ ] Every preserved indicator present: under-18 amber border, TEST chip, email/payment icons, current-user row, status badges with all states, EDITOR read-only variants.
- [ ] `admin-ui-design.md` updated (§6 + canonical mockup reference); `components.md` updated for changed shared components.

**Given / When / Then (test scenarios)**

- **Given** the admin submissions list with an under-18 participant and a TEST order, **When** it renders after restyle, **Then** the amber left-border, the "TEST" chip, and the payment/email indicator icons are all still shown.
- **Given** a logged-in EDITOR on přihlášky and submission detail, **When** the pages render, **Then** the read-only variant (no attendance toggle / Zaplatit / exports / test filter) is preserved exactly as before.
- **Given** the year sidebar with N conditional emails, **When** the drawer renders, **Then** it shows the restyled look AND the same N dynamic "podmíněný email" items with correct role-gating and active state.
- **Given** the full E2E suite, **When** `npx playwright test` runs after the restyle, **Then** it passes with no behavioral regressions.
- **Given** `npm run lint` and `npm run build`, **When** run on the branch, **Then** both complete green.

## 7. Risks

| Risk                                                                          | Category    | Likelihood | Impact | Mitigation                                                                                  |
| ----------------------------------------------------------------------------- | ----------- | ---------- | ------ | ------------------------------------------------------------------------------------------- |
| Blanket `sx` clobbers intentional per-cell styling (loses a highlight/border) | Correctness | Med        | Med    | Prefer `borderBottomColor`; inventory per-cell styles before edits; visual review vs mockup |
| Silent feature drift (a status/control dropped or added to match a mockup)    | Scope       | Med        | High   | Rule #0 real-component-wins; per-screen feature inventory; flag diffs, don't change scope   |
| Chrome restyle breaks responsive drawer / breadcrumb context                  | Correctness | Low        | Med    | Preserve `PageHeader`/layout mechanism; test mobile + breadcrumbs                           |
| Server→Client boundary violation (`component={Link}` from RSC)                | Build break | Med        | Med    | Use `DashedAddButton`/`LinkButton`; keep boundaries                                         |
| Large surface (~53 screens) → inconsistency or partial coverage               | Quality     | Med        | Med    | Phase by area; shared helpers; mockup as per-screen check                                   |
| Accessibility regressions (lost tooltip / focus ring)                         | A11y        | Low        | Med    | Keep `Tooltip`/`aria-label` + indigo focus ring in AC                                       |
| `admin-ui-design.md §6` left stale (says don't touch chrome)                  | Docs drift  | Med        | Low    | Doc update is an explicit requirement (#13)                                                 |

## 8. Open Questions / Assumptions

**Assumptions**

- Implementation may be phased by area; this assignment defines the full target. Phasing/order is a planning concern, not specified here.
- "Visually matches the mockup" is verified by reviewer comparison against the `mockups/admin/` slug (no automated visual-regression tooling required).
- Appbar restyle derives from `builderPalette` (no mockup); drawer follows the mockup exactly.
- Public theme, dark mode, and all non-visual logic remain untouched.

**Open questions:** none (all resolved in interview).

## 9. References

- Mockups: `mockups/admin/` (`index.html` map, `_shared.css`, all slugs)
- Design contract: `.claude/rules/admin-ui-design.md`
- Palette/helpers: `components/admin/email-builder/palette`, `components/admin/builder-field-sx.ts`, `components/admin/dashed-add-button.tsx`
- Implementation exemplar: `components/admin/section-types-list.tsx`
- Chrome: `components/admin/admin-layout.tsx`, `admin-drawer.tsx`, `year-sidebar.tsx`, `admin-app-bar.tsx`, `page-header.tsx`
- Component index: `docs/components.md`; DoD/workflow: project `CLAUDE.md`, `.claude/rules/development-workflow.md`
