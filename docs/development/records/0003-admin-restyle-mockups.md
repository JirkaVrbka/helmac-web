# 0003 — Admin UI restyle to the `mockups/admin/` builder palette

Date: 2026-10-30

## Assignment

Make every admin screen — and the app chrome (left drawer, top app bar, breadcrumbs) — match the
builder-palette reference mockups in `mockups/admin/` (indigo accent, white panes, dashed add buttons,
mono counts). A pure restyle: the look changes, but every feature, column, filter, chip, button, dialog,
badge, role-gated/read-only variant, and special indicator must survive unchanged. Supersedes the earlier
content-only, page-by-page rollout by defining the whole target (content + chrome) at once.

Source assignment: `docs/assignments/2026-10-29-admin-restyle-mockups.md`.

## Approach

Manager/subagent workflow, autonomous full run, sequential on branch `112-unified-admin-pages-redesign`.
Delegated in phases by area, each a self-contained implementer brief (restyle-only rules, exact file list,
mockup slug, preservation constraints, server/client gotchas); the manager verified each report and swept
cross-cutting checks (hex/style/className, lint, typecheck).

Phases: 0 contract-doc fix → 1 chrome → 2 dashboard+login → 3 nastavení (+3b shared `RichTextEditor` +
GDPR, pulled forward since many editors depend on it) → 4 novinky → 5 uživatelé → 6 ročníky/přehled/year
settings → 7 účastníci → 8 obsah/úvod block-editor children + stats editors → 9 stránky → 10 registrace
form-builder + settings → 11 submission detail/transakce/účast/success → 12 emaily templates + hromadné →
13a gap components (shared `ImageUploader`/`IconPicker`, missed forms/dialogs, email-page children) →
13b residual-align (insert dialogs, delete dialogs, tints, galerie/sekce) → 14 validation + docs.

Styling is applied exclusively through `builderPalette` tokens via MUI `sx` (no raw hex, no `style={}`
color, no color `className`), `builderFieldSx` for inputs, and the dashed add affordance; exemplar
`components/admin/section-types-list.tsx`.

## Key decisions

- **Chrome is now in scope.** `.claude/rules/admin-ui-design.md` §1 + §6 rewritten (previously "don't
  restyle the chrome") and repointed at `mockups/admin/` as canonical. Drawer matches the mockup exactly;
  app bar + breadcrumbs derived from the palette (no dedicated mockup).
- **Real component wins over the mockup.** Where a mockup showed more/less than the real screen, features
  were preserved and the divergence flagged, never changed (e.g. no invented status badge on news, no
  invented stat tiles on ročník přehled, kept collapsible accordions, kept all extra form-builder controls).
- **Content-output colors kept.** `rich-text-editor.tsx` `PRIMARY_COLOR` `#1976d2` is a value serialized
  into saved markdown/email HTML, not chrome — left untouched (changing it would alter authored data).
- **Preserved special indicators & gating** explicitly: under-18 amber left-border (lives in
  `submissions-table`), TEST chip, payment/email indicator icons, current-user row highlight, distinct-year
  participant chips, EDITOR read-only variants, year-sidebar dynamic conditional-email items.
- Sanctioned raw hex limited to documented hover/accent literals `#4338ca`, `#fecaca`, white-on-accent.
- Design-system primitives registered in `docs/components.md`: `builderPalette`, `builderFieldSx`,
  `DashedAddButton`.

## Outcome & deviations

- `npx tsc --noEmit`: exit 0. `next build` (production compile): success, all routes compiled.
- ESLint on `app/admin`, `components/admin`, `components/forms`: clean. (Whole-repo `eslint .` is red only
  from pre-existing generated files under `mockups/admin/_build/**` — unrelated to this work; a candidate
  for an eslint ignore.)
- E2E (`npx playwright test`, single spec `year-copy.spec.ts`) not run here: needs a running dev server
  (main-tree rule forbids the agent starting one) + DB/seed. Behavior untouched by the restyle.
- Open items flagged for the user (not fixed — out of restyle scope): `components/admin/sortable-pages.tsx`
  renders nowhere (the `obsah` mockup's "Stránky" pane is unwired in real code — wiring it would be a
  feature); stray `©` mojibake glyph in the `RichTextEditor` link-dialog title (content artifact);
  `year-sidebar.tsx` duplicates the `drawerItemSx` definition inline (minor DRY).
