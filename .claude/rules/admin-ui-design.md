---
paths:
    - "app/admin/**"
    - "components/admin/**"
    - "components/forms/**"
---

# Admin UI Design System

> Visual design language for **admin pages only**. Public-facing pages use a different theme
> (`styles/theme/publicTheme.ts`) and are out of scope here.
>
> When creating or updating any admin UI (pages under `app/admin/**`, components under
> `components/admin/**`, and admin forms under `components/forms/**`), follow this system so the
> admin area reads as one coherent product.
>
> **Canonical visual reference:** the mockups in `mockups/admin/` — one HTML file per admin screen,
> mapped by `mockups/admin/index.html`, sharing `mockups/admin/_shared.css`. Every admin screen (content
> **and** chrome) has a counterpart there; match each real screen against its slug. The live origin of the
> look is the Sekce screen (`components/admin/section-types-list.tsx`). Open those when in doubt — this
> document is the written contract, the mockups are the picture.

## 1. The two layers: chrome vs. content

Admin screens are made of two layers. Both now use the **builder palette** — but they play different roles,
so keep the visual distinction (chrome frames, content fills).

| Layer       | What it is                                                                                      | Styling source                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chrome**  | The app shell: left drawer (navigation), top app bar (breadcrumbs + page title), page container | **Builder palette.** Drawer follows the drawer in `mockups/admin/` exactly; the app bar is derived from the palette (no dedicated mockup). |
| **Content** | Everything inside the page body — cards, forms, lists, tables, toolbars                         | The **builder palette** (indigo-accented). This is where the design system lives.                                                          |

The chrome is owned by the layout (`components/admin/admin-layout.tsx`, `admin-drawer.tsx`,
`admin-app-bar.tsx`, `page-header.tsx`, `year-sidebar.tsx`). When restyling it, change **look only** —
preserve the exact menu structure, order, indentation, icons, dividers, role-gating, active-year injection,
the year-sidebar dynamic conditional-email items, the breadcrumb (`PageHeader`) mechanism, the page title,
and the mobile hamburger. Most design work still happens in the **content** layer.

## 2. Design tokens

The single source of truth for content-layer color is the **builder palette**:

```typescript
import { builderPalette as p } from "@/components/admin/email-builder/palette";
```

Use these tokens via the MUI `sx` prop — **never hardcode hex values** in components.

| Token                      | Value                 | Use                                                  |
| -------------------------- | --------------------- | ---------------------------------------------------- |
| `p.indigo`                 | `#4f46e5`             | Primary accent: active, links, primary action, focus |
| `p.indigoSoft`             | `#e0e7ff`             | Hover/selected backgrounds for indigo elements       |
| `p.indigoInk`              | `#312e81`             | Text on indigo-soft backgrounds                      |
| `p.ink`                    | `#0f172a`             | Primary text                                         |
| `p.ink2`                   | `#475569`             | Secondary text                                       |
| `p.ink3`                   | `#94a3b8`             | Tertiary text, icons, placeholders, muted labels     |
| `p.line`                   | `#dde2eb`             | Standard borders                                     |
| `p.lineSoft`               | `#eef1f6`             | Subtle internal dividers (e.g. table rows)           |
| `p.surface`                | `#ffffff`             | Card / raised surface                                |
| `p.surface2`               | `#f8f9fc`             | Recessed surface (canvas, toolbar, table head)       |
| `p.surface3`               | `#eaedf3`             | Pills, chips, inset chips                            |
| `p.value` / `p.valueInk`   | `#d1fae5` / `#065f46` | Positive state (paid, confirmed, success)            |
| `p.field` / `p.fieldInk`   | `#dbeafe` / `#1e3a8a` | Informational / neutral-blue state                   |
| `p.warnSoft` / `p.warnInk` | `#fef3c7` / `#92400e` | Warning / pending state                              |
| `p.neg` / `p.negInk`       | `#fee2e2` / `#991b1b` | Negative state (delete hover, rejected, unpaid)      |
| `p.or` / `p.orSoft`        | `#f97316` / `#ffedd5` | OR / disjunction accent (rule builders)              |

### Shape & spacing

- **Radii:** cards/panes `14px`; inner items, fields, buttons, blocks `10px`–`12px`; pills/chips `6px`; round pills/status badges `20px`.
- **Borders:** `1px solid p.line`. Dashed `1px dashed p.line` signals an **add / create** affordance.
- **Spacing:** MUI 8px scale via `sx`. Card padding ~`20px` (`p: 2.5`), toolbar gaps `10–14px`, grid gaps `16–18px`.
- **Transitions:** `all 140ms ease` on interactive elements.
- **Elevation:** flat by default (border, not shadow). Lift only on hover (`0 2px 10px rgba(15,23,42,0.06)`) or while dragging (`0 8px 24px rgba(0,0,0,0.15)`).

### Typography

- Base font is the theme default (Roboto).
- **Monospace** (`'JetBrains Mono', monospace`) for numeric/technical atoms: counts, variable symbols, slugs, prices, IDs.
- **Kicker label:** `fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: p.ink3`. This is the signature section-header treatment — use it for card/column headers instead of plain `h5/h6`.

## 3. Core component patterns

### Pane (card)

The primary container. White surface, `1px solid p.line`, `borderRadius: "14px"`, `overflow: "hidden"`.
Optional header strip: `borderBottom: 1px solid p.line`, `background: linear-gradient(180deg, p.surface, p.surface2)`,
holding a **kicker** label (left) and a **count pill** (right).

### Count pill

Mono, muted: `fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: p.ink2, backgroundColor: p.surface3, px: "7px", py: "2px", borderRadius: "6px"`.
For an emphasised/indigo count, swap to `p.indigoSoft` / `p.indigoInk`.

### Buttons

- **Primary action** — solid indigo: `backgroundColor: p.indigo`, white text, `borderRadius: "10px"`, hover `#4338ca`.
- **Secondary / cancel** — ghost: `backgroundColor: p.surface`, `border: 1px solid p.line`, `color: p.ink2`.
- **Add / create** — **dashed**: `backgroundColor: p.surface`, `border: 1px dashed p.line`, `color: p.indigo`, hover `borderColor: p.indigo` + `backgroundColor: p.indigoSoft`. Use this for every "Přidat…/Nové…" action. For a link-style create button, use the reusable **`DashedAddButton`** (`components/admin/dashed-add-button.tsx`, `href` + optional `fullWidth`) — it is a Client Component and renders safely from Server Component pages. Inline `onClick` variants can match it with `ButtonBase` + the same `sx` (see `section-types-list.tsx`).
- Keep `textTransform: "none"` (already the theme default).

### Icon button

`30px` square, transparent, `borderRadius: "8px"`, `color: p.ink3`. Hover → `color: p.indigo`, `backgroundColor: p.indigoSoft`.
Destructive variant hovers to `color: p.negInk`, `backgroundColor: p.neg`.

### Form controls (inputs)

The full control language is drawn in **`mockups/components.html`** — that page is the canonical
preview for every input below. Implement them with MUI, styled to these tokens.

**Shared field styling — use the helper.** For any MUI outlined input (`TextField`, `Select`,
`Autocomplete`, or the wrapping `FormControl`), spread **`builderFieldSx`**
(`components/admin/builder-field-sx.ts`) rather than re-writing the override each time. It gives:
`borderRadius: "10px"`, white surface, `fieldset` border `p.line`, hover `p.ink3`, focus `borderColor: p.indigo`

- ring `box-shadow: 0 0 0 3px p.indigoSoft`, and the error equivalents (`p.negInk` border, `p.neg` ring).
  `ListFilters` is the reference usage.

* **Text field:** `height: 40px` (MUI `size="small"`). Label above: `fontSize: 12, fontWeight: 600, color: p.ink2`; required marker `p.negInk`; hint below `p.ink3`, error text `p.negInk`.
* **Search:** text field with a leading `Search` icon and a trailing `Clear` icon when filled (`InputAdornment`). Same focus ring. See `ListFilters`.
* **Select:** uses `builderFieldSx`; closed shows a chevron in `p.ink3`. Open menu (`MenuItem`s): white pane, `borderRadius: "10px"`, `box-shadow: 0 12px 30px rgba(15,23,42,0.12)`, items hover `p.indigoSoft`, selected item `p.indigoInk` + a trailing check in `p.indigo`.
* **Autocomplete (multi):** input-chips in `p.indigoSoft` / `p.indigoInk`, `borderRadius: "7px"`, each with a small ✕; same field border/focus.
* **Switch:** track `p.surface3` off / `p.indigo` on, white knob. Label `p.ink2`.
* **Checkbox:** 18px, `borderRadius: "5px"`, `1px solid p.line`; checked → `p.indigo` fill, white check.
* **Radio:** 18px circle; selected → `p.indigo` border + `p.indigo` dot.
* **Segmented control (`ToggleButtonGroup`):** track `p.surface2` with `1px solid p.line`, `borderRadius: "10px"`, inner padding `3px`; active segment filled `p.indigo` white. AND/OR variant: AND active `p.indigo`, OR active `p.or`.
* **Date / time pickers (MUI X):** render the text field through `builderFieldSx`; trailing calendar/clock icon in `p.ink3`.

### Status / filter chips & badges

- **Filter chip (toggle):** pill (`borderRadius: 20px`), `1px solid p.line`, `color: p.ink2`; active → filled `p.indigo` white; optional leading color dot.
- **Status badge:** small round pill with a leading dot, color-coded by **meaning** (not by MUI color name) — positive `p.value/p.valueInk`, pending `p.warnSoft/p.warnInk`, info `p.field/p.fieldInk`, neutral/cancelled `p.surface3/p.ink2`, negative `p.neg/p.negInk`.
    - **Convention (no shared component yet):** there is no global `StatusBadge` export. Each table/screen defines a small local badge — a `Box` pill (`borderRadius: "20px"`, `backgroundColor: bg`, `color: fg`) with a leading `currentColor` dot — and a `{ label, bg, fg }` map from the domain status to the meaning tokens above. Reference: the local `StatusBadge` in `bank-transactions-table.tsx` / `submissions-table.tsx`. Map an enum to meaning, never to a literal color (e.g. `SENT→value`, `FAILED→neg`, `PENDING→surface3`). If you build a genuinely shared one, register it in `docs/components.md` and point this bullet at it.

### Tabs

Underline style: row with `borderBottom: 1px solid p.line`; inactive tab `p.ink2`, active `p.indigo` with a 2px `p.indigo` underline. `textTransform: "none"` (theme default).

### Dialogs

Paper `borderRadius: "14px"` (`PaperProps={{ sx: { borderRadius: "14px" } }}`). Title `fontWeight: 700`.
Actions right-aligned: **Cancel** = ghost button (`1px solid p.line`, `color: p.ink2`, radius 10), **confirm** = primary indigo, or for a destructive confirm a **soft-danger** button (`backgroundColor: p.neg`, `color: p.negInk`, hover `#fecaca`, `disableElevation`). `AlbumActions` is the reference delete dialog.

### Tooltips

Keep MUI `Tooltip` for every icon-only control. (The dark bubble is acceptable as-is.)

### Tables

Wrap in a pane. Head row: `backgroundColor: p.surface2`, uppercase 10px letter-spaced `p.ink3` headers, `borderBottom: 1px solid p.line`.
Body rows separated by `p.lineSoft`, hover `p.surface2`. Lead cell can carry a rounded-square avatar (`p.indigoSoft`/`p.indigoInk` initials). Numeric columns use the mono treatment.

### Lists / grids / cards

Card grids use `repeat(auto-fill, minmax(260px, 1fr))`, gap `18px`. Each card: pane styling, hover lift + `translateY(-2px)`.
Sortable items carry a **drag grip** (`DragIndicator`, `color: p.ink3`, `cursor: grab`) — the admin uses dnd-kit; preserve the grip affordance whenever `sortOrder` exists.

### Stat tile

Dashboard / overview metrics (dashboard, ročník přehled, účastníci). A pane (`p.surface`, `1px solid p.line`,
`borderRadius: "14px"`, padding ~`18–20px`) holding: a square **icon tile** (`38–44px`, `borderRadius: "11px"`,
`backgroundColor: p.indigoSoft`, icon `color: p.indigo` — one uniform indigo, not per-metric colors), a **value**
in mono (`'JetBrains Mono'`, ~`1.7rem`, `fontWeight: 700`, `color: p.ink`), and a plain **label** (`~0.8rem`,
`color: p.ink2` — a label, not a kicker). Grid: `repeat(auto-fit, minmax(190px, 1fr))`. Reference:
`app/admin/page.tsx`.

### Block / builder canvases

Editable content areas (section content, rule lists) sit on a recessed canvas: `backgroundColor: p.surface2`, `1px solid p.line`,
`borderRadius: "14px"`, padding `12px`. Items inside are white blocks with a grip, a small uppercase **type tag** (`p.indigoSoft`/`p.indigo`), content, and right-aligned edit/delete icon buttons. Creation happens through dashed add buttons at the bottom.

### Empty states

Dashed-border pane (`1px dashed p.line`), centered muted text (`p.ink3`), generous padding — consistent with the add-affordance language.

### Chrome (drawer & app bar)

The app shell is now on the builder palette too (see §1 and §4 rule 6). Concrete recipe:

- **Drawer surface:** paper `backgroundColor: p.surface`, `borderRight: 1px solid p.line`; default item text `p.ink2`, icons `p.ink3`. Apply to **both** the temporary (mobile) and permanent (desktop) papers.
- **Drawer item** (shared `sx`): inset `mx: 1`, `borderRadius: "10px"`, `transition: all 140ms ease`, `position: relative`. Inactive hover → `backgroundColor: p.surface2`, text `p.ink`, icon `p.ink2`.
- **Active item** (drive off MUI `selected`, style `&.Mui-selected`): `backgroundColor: p.indigoSoft`, text `p.indigoInk` + `fontWeight: 600`, icon `p.indigo`; pin the selected-hover to the same so there is no blue flash. **Left accent bar** via `&.Mui-selected::before` — absolute, `left: 0`, `top/bottom: 7`, `width: 3`, `borderRadius: "0 3px 3px 0"`, `backgroundColor: p.indigo`.
- **Section dividers:** inset `Divider` in `p.lineSoft`. **User footer:** square-ish avatar (`borderRadius: 10`, `backgroundColor: p.indigo`), name `p.ink`, role chip outlined (`p.line` / `p.ink2`), logout icon button hover → `p.neg` / `p.negInk`.
- **App bar** (no mockup — derive from palette, keep consistent with drawer): `backgroundColor: p.surface`, no shadow, `borderBottom: 1px solid p.line`, title `p.ink`, hamburger `p.ink2`; **breadcrumbs** link `p.ink2` hover `p.indigo`, separator `p.ink3`, current crumb `p.ink`.
- Restyle only: preserve the exact menu/order/icons/role-gating, active-year injection, year-sidebar dynamic conditional-email items, the `PageHeader` breadcrumb mechanism + Dashboard home crumb + page title, and the mobile hamburger / responsive collapse. Reference: `admin-drawer.tsx`, `year-sidebar.tsx`, `admin-app-bar.tsx`.

## 4. Implementation rules

0. **RESTYLE ONLY — preserve behavior and content exactly (highest priority).** A redesign changes
   _appearance_, never _features_. Before editing a page/component, inventory what it already does and keep
   **all** of it: every column, filter, control, interaction, indicator icon, row/cell highlight, tooltip,
   sort, count, empty state, role gating, and conditional. **Add nothing** that was not there (no new columns,
   badges, data, or controls — e.g. do **not** surface a status that was intentionally filter-only) and
   **remove nothing** (e.g. the under-18 `warning.main` left-border highlight, the TEST chip, email/payment
   indicator icons). Keep existing wording, option labels, and element placement (count/action buttons stay
   where they were). If a mockup shows more or less than the real component, the **real component wins** —
   flag the difference and **ask** before changing feature scope. Beware blanket `sx` overrides that clobber
   intentional per-cell styling (e.g. use `borderBottomColor`, not `borderColor`, so a warning left-border
   survives). A restyle PR should change only look, never what the screen can do.
1. **Tokens, not hex.** Always style through `builderPalette` + `sx`. No raw hex, no `style={}`, no `className` for color. **Sanctioned exceptions only:** the two hover literals `#4338ca` (primary-indigo hover — the palette has no darker-indigo token) and `#fecaca` (soft-danger hover), and white-on-accent text/icons (`#fff`). Do not introduce others. **Content-output colors are NOT chrome — leave them:** a hex that gets serialized into saved data (e.g. the `RichTextEditor` default text color `#1976d2`, written into the page/email markdown/HTML) must stay as-is; tokenizing it would change authored content, not appearance. Flag such values with a comment instead of converting them.
2. **Match the mockups, build with MUI.** The mockups are plain HTML/CSS for preview only. Real pages are React + MUI (`Box`, `Card`, `Typography`, `ButtonBase`, etc.) styled via `sx` — port the _look_, not the markup. `section-types-list.tsx` is the reference implementation.
3. **Reuse before rebuild.** Check `docs/components.md` and existing `components/admin/*` for a matching pane/pill/chip/table pattern before writing new styling.
4. **Server Components by default** (see `components.md`); add `"use client"` only for interactivity (dnd, dialogs, form state). **Gotcha:** do **not** pass `component={Link}` to MUI `ButtonBase`/`Button` from a Server Component — React throws _"Functions cannot be passed directly to Client Components"_. Wrap such a button in a small Client Component (as `DashedAddButton` and `LinkButton` do) and render that instead.
5. **Czech UI text, English code** (see root `CLAUDE.md`).
6. **Chrome is in scope — restyle it to the palette.** The left drawer (default + year-scoped), top app bar,
   breadcrumbs, and page title use the builder palette. The drawer matches the drawer in `mockups/admin/`
   exactly (builder surface, indigo active state with left accent bar, section dividers, restyled user footer);
   the app bar + breadcrumbs are derived from the palette (no dedicated mockup) and must stay consistent with
   the drawer. **Restyle only:** preserve menu structure/order/indentation/icons/dividers, role-gating,
   active-year injection, the year-sidebar dynamic conditional-email items, the breadcrumb (`PageHeader`)
   context + Dashboard home crumb + page title, the mobile hamburger, and responsive drawer collapse.
7. **Accessibility:** every icon-only button needs a `Tooltip`/`aria-label`; keep focus-visible rings (the indigo focus shadow) intact.
