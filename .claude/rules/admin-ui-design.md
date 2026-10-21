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
> **Canonical visual reference:** the mockups in `mockups/nova-sekce.html`, `mockups/galerie.html`,
> and `mockups/prihlasky.html`. The live origin of the look is the Sekce screen
> (`components/admin/section-types-list.tsx`). Open those when in doubt — this document is the
> written contract, the mockups are the picture.

## 1. The two layers: chrome vs. content

Admin screens are made of two visually distinct layers. **Do not blur them.**

| Layer       | What it is                                                                                      | Styling source                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Chrome**  | The app shell: left drawer (navigation), top app bar (breadcrumbs + page title), page container | Default MUI admin theme (`styles/theme/adminTheme.ts`), primary blue `#1976d2`. Leave it as-is. |
| **Content** | Everything inside the page body — cards, forms, lists, tables, toolbars                         | The **builder palette** (indigo-accented). This is where the design system lives.               |

The chrome is owned by the layout (`app/admin/rocniky/[id]/layout.tsx`, `PageHeader`, `year-sidebar.tsx`)
and almost never needs touching. New design work happens in the **content** layer.

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
- **Add / create** — **dashed**: `backgroundColor: p.surface`, `border: 1px dashed p.line`, `color: p.indigo`, hover `borderColor: p.indigo` + `backgroundColor: p.indigoSoft`. Use this for every "Přidat…/Nové…" action (see `section-types-list.tsx` "Přidat sekci").
- Keep `textTransform: "none"` (already the theme default).

### Icon button

`30px` square, transparent, `borderRadius: "8px"`, `color: p.ink3`. Hover → `color: p.indigo`, `backgroundColor: p.indigoSoft`.
Destructive variant hovers to `color: p.negInk`, `backgroundColor: p.neg`.

### Fields

`height: 40px`, `1px solid p.line`, `borderRadius: "10px"`, white. Focus ring: `borderColor: p.indigo` + `box-shadow: 0 0 0 3px p.indigoSoft`.
Labels sit above the field: `fontSize: 12, fontWeight: 600, color: p.ink2`; required marker in `p.negInk`. Hints below in `p.ink3`.
In MUI, keep `TextField size="small"` but align radius/border to these tokens via `sx` where the plain outline is too heavy.

### Status / filter chips & badges

- **Filter chip (toggle):** pill (`borderRadius: 20px`), `1px solid p.line`, `color: p.ink2`; active → filled `p.indigo` white; optional leading color dot.
- **Status badge:** small round pill with a leading dot, color-coded by meaning — positive `p.value/p.valueInk`, pending `p.warnSoft/p.warnInk`, info `p.field/p.fieldInk`, neutral/cancelled `p.surface3/p.ink2`, negative `p.neg/p.negInk`.

### Tables

Wrap in a pane. Head row: `backgroundColor: p.surface2`, uppercase 10px letter-spaced `p.ink3` headers, `borderBottom: 1px solid p.line`.
Body rows separated by `p.lineSoft`, hover `p.surface2`. Lead cell can carry a rounded-square avatar (`p.indigoSoft`/`p.indigoInk` initials). Numeric columns use the mono treatment.

### Lists / grids / cards

Card grids use `repeat(auto-fill, minmax(260px, 1fr))`, gap `18px`. Each card: pane styling, hover lift + `translateY(-2px)`.
Sortable items carry a **drag grip** (`DragIndicator`, `color: p.ink3`, `cursor: grab`) — the admin uses dnd-kit; preserve the grip affordance whenever `sortOrder` exists.

### Block / builder canvases

Editable content areas (section content, rule lists) sit on a recessed canvas: `backgroundColor: p.surface2`, `1px solid p.line`,
`borderRadius: "14px"`, padding `12px`. Items inside are white blocks with a grip, a small uppercase **type tag** (`p.indigoSoft`/`p.indigo`), content, and right-aligned edit/delete icon buttons. Creation happens through dashed add buttons at the bottom.

### Empty states

Dashed-border pane (`1px dashed p.line`), centered muted text (`p.ink3`), generous padding — consistent with the add-affordance language.

## 4. Implementation rules

1. **Tokens, not hex.** Always style through `builderPalette` + `sx`. No raw hex, no `style={}`, no `className` for color.
2. **Match the mockups, build with MUI.** The mockups are plain HTML/CSS for preview only. Real pages are React + MUI (`Box`, `Card`, `Typography`, `ButtonBase`, etc.) styled via `sx` — port the _look_, not the markup. `section-types-list.tsx` is the reference implementation.
3. **Reuse before rebuild.** Check `docs/components.md` and existing `components/admin/*` for a matching pane/pill/chip/table pattern before writing new styling.
4. **Server Components by default** (see `components.md`); add `"use client"` only for interactivity (dnd, dialogs, form state).
5. **Czech UI text, English code** (see root `CLAUDE.md`).
6. **Don't restyle the chrome.** Drawer, app bar, breadcrumbs, and page title stay on the default admin theme.
7. **Accessibility:** every icon-only button needs a `Tooltip`/`aria-label`; keep focus-visible rings (the indigo focus shadow) intact.
