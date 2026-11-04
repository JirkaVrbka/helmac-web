# 0004 — Per-item price breakdown in the "Platba" card

Date: 2026-11-04

## Assignment

On the admin registration (submission) detail page, add a read-only per-item price breakdown
inside the "Platba" card — a flat list of every selected priced item (incl. 0 Kč), each line
"label: option ×qty … price" — placed directly under the total and above the tier summary, so an
admin can validate exactly what an attendee has/pays on arrival. Restyle-only elsewhere; no pricing
model change.

Assignment: `docs/assignments/2026-11-04-platba-price-breakdown.md`.

## Approach

Manager/subagent workflow: implement → independent spec-compliance + code review → validate
(tsc/eslint/build). Two files changed:

- `components/admin/submission-detail/helpers.ts` — extracted the per-field pricing loop from
  `computeTotal` into a new `buildPriceLines(...)` that emits a flat `PriceLine[]`
  (`{ label, optionName, quantity, price }`) across all people; `computeTotal` now just reduces those
  lines. Added `buildPaidPriceLines(order.people)` which reads the stored line items
  (`unitPriceAtSubmission × quantity`).
- `components/admin/submission-detail/index.tsx` — renders the breakdown (kicker "Rozpis ceny",
  palette tokens, `formatPrice`) between the total block and `SubmissionPricingSummary`.

## Key decisions

- **Single source of truth for the sum.** Unpaid lines come from the _same_ `buildPriceLines` call
  that `computeTotal` reduces, so the breakdown sum cannot drift from the live total. Paid lines use
  the frozen `unitPriceAtSubmission` (the update-prices cron only touches unpaid orders), so they sum
  to `order.totalPrice`. This deliberately diverged from the assignment's suggested reuse of the
  public `computePricingLineItems` (a separate math path that could drift) — the reviewer confirmed
  the chosen approach is safer for the "sum == displayed total" acceptance criterion.
- Breakdown matches the _effective_ total (paid → `order.totalPrice`, unpaid → live `computedPrice`
  shown by `SubmissionPricingSummary`).
- Addition only: status/paid controls, bank transactions, VS, and the tier summary are untouched;
  the breakdown renders identically for the read-only EDITOR.

## Outcome & deviations

- `tsc --noEmit`, `eslint`, and an isolated `next build` (via `NEXT_DIST_DIR`) all pass.
- Review verdict: SHIP, no confirmed defects (nits: `key={i}` cosmetic; broken-data edge with no
  sum impact; pre-existing dual-total display between the static "Cena při registraci" row and the
  live tier-summary total).
- Side fix during validation: broadened the ESLint ignore from `**/.next/**` to `**/.next*/**` so the
  isolated build dir (`.next-test`) isn't linted.
- No automated test added (the AC scenarios need seeded orders with line items); verified by static
  gates + review. E2E can be added later if desired.
