# 0001 — Interactive project overview (docs/overview.html)

Date: 2026-10-13

## Assignment

Produce a single, high-quality, beautifully visualized HTML page that explains the whole project to
someone who has never seen it (both a non-technical boss and a client). It must cover: what the project
is and does in plain language, the big picture (inputs → processing → database → responses), clickable
SVG flow diagrams (each step opens a modal with a description and the real code, with ‹ › buttons and
← → keys between steps, plus scenario buttons that animate a typical path), and everything else (search,
security, big picture) hidden behind the diagrams as click-to-open modals. It also had to include a
"3D documentation" code browser: the application's core code embedded in the page, where every function/
class name links to its definition, and each definition shows where it is used, what it calls, and which
tests run it (links computed by static analysis at generation time, code never executed), with `/` to
search and a Back button. Rules: code is always inserted from the repository (never hand-copied); one
file; works offline; light and dark mode; no horizontal overflow at 375 px; and the generator must
self-verify that every click has a target, every card has a click, and every code link points to a real
line.

## Approach

A Node generator (`scripts/build-overview.mjs`) reads the core source set (`lib` minus the generated
`lib/icons`, `prisma`, all of `app`, plus `proxy.ts`/`instrumentation.ts`/`contexts`/`types`), parses it
with the installed TypeScript compiler API (`ts.createSourceFile`) to build a symbol table, then computes
cross-references (definition, uses, calls) for every uniquely-named symbol — uniqueness guarantees each
link resolves to exactly one real line. All code shown (flow modals, security cards, code browser) is
sliced from the repository at build time. Narrative/flow content (Czech, plain language) lives as a data
model in the generator and points at files by symbol or line range. The page shell (CSS + client JS) is
kept in `scripts/overview-assets/` and inlined at build time; the data is injected as JSON. Flow diagrams
are rendered client-side as responsive vertical SVG; modals support ‹ ›/arrow navigation; scenarios
animate node highlights. The generator runs an authoritative self-check and refuses to write on any
failure. Output: `docs/overview.html` (single offline file). Added npm script `docs:overview`.

The content was mapped by four parallel exploration sub-agents (public registration flow, admin
CRUD/auth/upload/rich-text, mass-email queue + crons, and a source inventory), consistent with the
project's delegate-and-review workflow.

## Key decisions

- Scope limited to the application core (not `components/`, not generated `lib/icons`) per the user's
  choice, keeping the single file at ~5.6 MB / ~32.9k lines while still "the whole app code" in spirit.
- Static analysis via the TypeScript compiler API already in `node_modules` (no new dependency); only
  uniquely-named symbols are linkified so every link has a single correct target.
- Tests mapping is a documented no-op: the project has no tests (`tests/` is empty) — the code browser
  states this explicitly rather than faking it.
- Generator self-verification is the gate (every node/card/link resolves) and throws before writing.

## Outcome & deviations

Delivered `docs/overview.html` plus the reusable generator. Generator self-check passes (223 files,
32,895 lines, 900 linked symbols, 2,402 code links). Verified in headless Chromium: 20/20 checks pass,
including 0 horizontal overflow at 375 px, dark mode, chip/flow/security modals, ‹ ›/arrow step
navigation, "open in code browser", symbol-link → definition + uses/calls panel, Back button, and `/`
search. `npm run lint` is clean on the new files. Deviation from the original request: there is no
dedicated in-app search feature, so "search" is presented as the real lookup/filter mechanisms
(`findDuplicateEmail`, `checkCapacity`, `getYears` filters, `getOrderByLegacyId`). No commit made
(project rule: only the user commits).
