**State:** done

# Assignment: "Platba" card price field — show current price (unpaid) / amount paid (paid)

## 1. Title

Change the price field in the submission-detail "Platba" card to reflect what the user currently owes (unpaid) or actually paid (paid).

## 2. Type

**change-request** — changes the meaning, value, label, and caption of an existing field; strong behavior-preservation for the rest of the card.

## 3. Summary / Context

In the admin submission detail "Platba" card, the top price field is labelled **"Cena při registraci"** and always shows the stored `order.totalPrice` with a caption of the submission date — for both paid and unpaid orders. For an unpaid order this stored value is only refreshed by a daily price-sync cron, so it can lag the real current-tier price; and the "at registration" framing doesn't tell the admin what the number actually represents now. Admins need to see, at a glance, **what an unpaid user must pay today** and **what a paid user actually paid**.

**Current behavior:** field = `order.totalPrice` (both states); label = "Cena při registraci"; caption = submission date (`createdAt`).

**Desired behavior:**

- **Unpaid** → value = the **live current-tier total** (the component's already-computed `computedPrice`); label = **"Aktuální cena"**; caption = **"dle aktuálního tarifu"**.
- **Paid** → value = the **stored `order.totalPrice`** (the amount actually billed/paid); label = **"Zaplaceno"**; caption = the **payment date** (`paidAt`).

## 4. Scope

**In scope**

- The single price field (value + label + caption) at the top of the "Platba" card in `components/admin/submission-detail/index.tsx`.
- Reactive switching of that field with the card's existing paid/unpaid state (`currentPaid`).

**Out of scope**

- The tier summary (`SubmissionPricingSummary`), the per-item price breakdown, bank-transaction block, VS, status Select, and paid toggle — all unchanged.
- Pricing calculation, the price-sync cron, the data model, how/when `order.totalPrice` is written.
- Any change to what a paid order is charged (display only; no recompute persisted).
- Public pages.

## 5. Requirements

1. **Unpaid value** — when the order is unpaid, the field shows the **live current-tier total** (`computeTotal` at the currently-active tier — the component's existing `computedPrice`), not the possibly-stale stored `order.totalPrice`.
2. **Paid value** — when the order is paid, the field shows the **stored `order.totalPrice`** (the amount actually billed/paid), formatted as currency.
3. **Dynamic label** — unpaid → **"Aktuální cena"**; paid → **"Zaplaceno"**.
4. **Dynamic caption** — unpaid → **"dle aktuálního tarifu"**; paid → the **payment date** (`paidAt`), formatted as the card formats dates.
5. **Reactive to paid toggle** — the value, label, and caption update immediately when the admin flips the existing paid/unpaid control (driven by `currentPaid`, consistent with the rest of the card).
6. **Preserve everything else** — the tier summary, per-item breakdown, bank transactions, VS, status Select, and paid toggle below are unchanged; display-only; identical for the read-only EDITOR variant.
7. **Graceful edges** — `order.totalPrice` null → "0 Kč"; paid but `paidAt` missing → show the "Zaplaceno" label without a date (no crash, no "Invalid Date").

## 6. Acceptance Criteria

**Checklist (review)**

- [x] Unpaid order: field shows the live current-tier total (equals the unpaid total shown by the tier summary), label "Aktuální cena", caption "dle aktuálního tarifu".
- [x] Paid order: field shows stored `order.totalPrice`, label "Zaplaceno", caption = payment date.
- [x] Flipping the paid toggle switches value + label + caption live.
- [x] Tier summary, per-item breakdown, bank tx, VS, status/paid controls unchanged; read-only EDITOR unaffected.
- [x] Null total → "0 Kč"; paid with no `paidAt` → label only, no broken date.

**Given / When / Then**

- **Given** an **unpaid** order whose current tier price differs from the stored value, **When** the detail renders, **Then** the field shows the live current-tier total with label "Aktuální cena" and caption "dle aktuálního tarifu".
- **Given** a **paid** order, **When** the detail renders, **Then** the field shows `order.totalPrice` with label "Zaplaceno" and caption equal to the payment date.
- **Given** a paid order shown in the card, **When** the admin toggles it to unpaid, **Then** the field switches to the live current-tier total with the "Aktuální cena" label/caption (and back on re-toggle).
- **Given** a logged-in EDITOR, **When** the detail renders, **Then** the field displays per the above with no editing affordance added.
- **Given** a paid order with no recorded `paidAt`, **When** it renders, **Then** "Zaplaceno" shows without a date and nothing errors.

## 7. Risks

| Risk                                                                     | Category    | Likelihood | Impact | Mitigation                                                                                                |
| ------------------------------------------------------------------------ | ----------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Field value disagrees with the tier-summary total (two totals on screen) | Correctness | Med        | Med    | R1/R2 reuse the same `computedPrice`/`order.totalPrice` the summary already uses, so they match per state |
| Using `order.isPaid` instead of the live `currentPaid` state → no react  | Correctness | Med        | Low    | R5 ties the field to `currentPaid`                                                                        |
| Misleading label left in place / partial change                          | Clarity     | Low        | Low    | R3/R4 change label + caption together with the value                                                      |
| Date formatting on missing `paidAt` crashes or prints "Invalid Date"     | Correctness | Low        | Med    | R7 graceful fallback                                                                                      |
| Accidental change to the tier summary or breakdown below                 | Regression  | Low        | Med    | R6 scope limited to the one field                                                                         |

## 8. Open Questions / Assumptions

**Assumptions**

- The field uses the component's existing `computedPrice` (live current-tier total) for the unpaid value and `order.totalPrice` for the paid value — no new computation or data.
- Paid value is the stored amount billed (chosen over recomputing at the payment-day tier).
- Paid-with-no-`paidAt` is rare; showing the label without a date is acceptable (derived, not separately confirmed).

**Open questions:** none.

## 9. References

- Field + card: `components/admin/submission-detail/index.tsx` ("Platba" card; current field ≈ lines 1093–1110; `computedPrice` ≈ 375; `currentPaid` ≈ 226; `currentTierId` via `getCurrentTierId(order.priceTiers, order.paidAt ? … : undefined)` ≈ 235)
- Helpers: `components/admin/submission-detail/helpers.ts` (`computeTotal`, `getCurrentTierId`)
- Format: `lib/utils/pricing.ts` (`formatPrice`), the card's `formatDateTime`
- Data: `V2Order` (`totalPrice`, `isPaid`, `paidAt`) in `prisma/schema.prisma`; `lib/services/v2.ts` `getOrderByLegacyId`
- Design contract: `.claude/rules/admin-ui-design.md`
