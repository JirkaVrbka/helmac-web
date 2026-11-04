**State:** done

# Assignment: Per-item price breakdown in the registration detail "Platba" card

## 1. Title

Show a per-item price breakdown under the total in the submission detail's "Platba" card.

## 2. Type

**feature** — surfaces existing per-item pricing data as a new read-only display; no pricing math or data model changes.

## 3. Summary / Context

On the admin registration (submission) detail page, the "Platba" card shows only the grand total ("Cena při registraci"), a per-tier summary, bank transactions, and the status/paid controls. An admin validating what an attendee has on arrival can't see _which_ priced items make up that total. The order already stores every priced line (field label, option name, quantity, unit price), and the app already computes "label → price" breakdowns elsewhere (public account `computePricingLineItems` + `PriceBreakdown`). This feature adds a flat per-item breakdown directly under the total so the admin can read off exactly what the user is paying for. **Why:** faster, error-free on-site validation of each registration.

## 4. Scope

**In scope**

- A per-item price breakdown rendered inside the "Platba" card of `components/admin/submission-detail/index.tsx`, placed directly under the total and above the existing `SubmissionPricingSummary`.
- Flat listing of every selected priced item across all people in the order (main + additional).
- Reusing the already-loaded order line-item data and existing breakdown logic.

**Out of scope**

- Any change to the total, tier summary, bank-transaction block, VS, status Select, or paid toggle (all preserved).
- Changes to pricing calculation, the pricing data model, line-item storage, or order data fetching.
- Per-person grouping/subtotals (explicitly a flat list).
- Public-facing pages, the registration form, confirmation emails.
- Print/export of the breakdown.

## 5. Requirements

1. **Placement (addition only)** — a per-item breakdown appears in the "Platba" card directly **under** the total ("Cena při registraci") and **above** the existing tier summary (`SubmissionPricingSummary`). Everything else in the card is unchanged.
2. **Flat list** — one line per selected priced item across all people (main + additional), with **no** per-person grouping. If multiple people selected the same option, each selection is its own line.
3. **Line content & ordering** — each line shows the field label + chosen option name, the quantity when the field is a quantity-type priced field (e.g. "×2"), and the item's price. Items priced **0 Kč are included**. Lines are ordered **priced (> 0 Kč) first**, followed by the **0 Kč items inside a collapsible section ("Položky zdarma (N)") that is collapsed by default**.
4. **Only priced fields** — lines come only from priced fields (`pricing_select` / `pricing_multi_select` / `pricing_quantity`). Non-priced form answers are not listed.
5. **Prices = what the user actually pays** — if the order is **unpaid**, lines use **live current-tier** prices; if **paid**, lines use the **locked-in prices** from payment (the stored per-line values). The **sum of all breakdown lines MUST equal the total displayed in the card** (live computed when unpaid / `order.totalPrice` when paid).
6. **Read-only display** — the breakdown is display-only (no inputs/actions) and shown identically for all admin roles, including the read-only EDITOR variant; it introduces no behavior change to any existing control.
7. **Reuse, don't rebuild** — reuse the already-loaded order line-item data (field label, option name, quantity, stored unit price), pricing definitions, and current tier, plus the existing breakdown logic (`computePricingLineItems` / the `PriceBreakdown` layout). No new pricing math and no new data fetching.
8. **Admin builder-palette styling** — the breakdown matches the Platba card's builder-palette look (tokens via `sx`, `formatPrice`, Czech labels; e.g. a "Rozpis ceny" header), responsive.
9. **Empty state** — if the order has no priced items, show a subtle muted note (e.g. "Žádné placené položky") rather than an empty block.

## 6. Acceptance Criteria

**Checklist (review)**

- [x] Breakdown renders in the Platba card, directly under the total and above the tier summary.
- [x] Flat list (no per-person grouping); one line per selected priced item, duplicates shown separately.
- [x] Each line shows label + option (+ quantity where applicable) + price; 0 Kč items included.
- [x] Only priced fields produce lines; plain form answers excluded.
- [x] Line prices reflect paid vs unpaid correctly and **sum to the card's displayed total**.
- [x] Display-only; unchanged for read-only EDITOR; total, tiers, bank tx, VS, status/paid all intact.
- [x] Reuses existing line-item data + breakdown logic; no new fetch/pricing math.
- [x] Builder-palette styling, Czech labels, responsive; muted empty note when no priced items.

**Given / When / Then**

- **Given** an order with "Ubytování – stan" (300 Kč) and "Strava – plná penze" (0 Kč), **When** the detail renders, **Then** both appear as lines (incl. the 0 Kč one) and the priced line sums contribute to the shown total.
- **Given** an **unpaid** order, **When** the breakdown renders, **Then** its lines use current-tier prices and sum exactly to the live total shown in the card.
- **Given** a **paid** order, **When** the breakdown renders, **Then** its lines use the locked-in prices and sum exactly to `order.totalPrice`.
- **Given** an order with additional people each having priced items, **When** it renders, **Then** all items appear in a single flat list (no person grouping), each as its own line.
- **Given** a logged-in **EDITOR**, **When** the detail renders, **Then** the breakdown is shown (read-only) and no editing controls are added.
- **Given** an order with no priced items, **When** it renders, **Then** a muted "no items" note is shown instead of an empty block.

## 7. Risks

| Risk                                                                      | Category    | Likelihood | Impact | Mitigation                                                                       |
| ------------------------------------------------------------------------- | ----------- | ---------- | ------ | -------------------------------------------------------------------------------- |
| Breakdown total diverges from the card's displayed total (paid vs unpaid) | Correctness | Med        | High   | R5 ties line prices to the same paid/unpaid logic; AC asserts sum == shown total |
| Reusing public-theme breakdown component leaks public styling into admin  | Consistency | Med        | Low    | R8 requires admin palette tokens; reuse logic, not public visuals                |
| Editing the Platba card clobbers existing controls/restyle                | Correctness | Low        | Med    | R1/R6 addition-only; preserve existing card content                              |
| Legacy vs V2 pricing-shape mismatch yields wrong/empty lines              | Correctness | Med        | Med    | R7 reuse validated line data + current-tier logic; AC covers paid/unpaid sums    |
| Accessibility/responsive regression in a dense card                       | A11y        | Low        | Low    | R8 responsive + readable labels                                                  |

## 8. Open Questions / Assumptions

**Assumptions**

- The displayed total already follows paid→`order.totalPrice` / unpaid→live `computedPrice`; the breakdown mirrors that so it reconciles.
- No priced items → a muted note (derived, not separately confirmed).
- Flat list shows each line item separately (no aggregation of identical options chosen by different people).

**Open questions:** none.

## 9. References

- Detail component/card: `components/admin/submission-detail/index.tsx` (Platba pane; total from `order.totalPrice`, live `computedPrice`), `components/admin/submission-detail/helpers.ts` (`computeTotal`, `getCurrentTierId`)
- Existing summary: `components/admin/submission-pricing-summary.tsx`
- Reuse logic/layout: `lib/utils/pricing-line-items.ts` (`computePricingLineItems`), `components/public/features/account/price-breakdown.tsx` (`PriceBreakdown`), `lib/utils/pricing.ts` (`formatPrice`)
- Data: `lib/services/v2.ts` (`getOrderByLegacyId`, `getFormStructure`); models `V2OrderLineItem`, `V2PricingDefinition`, `V2PriceTier` in `prisma/schema.prisma`
- Design contract: `.claude/rules/admin-ui-design.md`
