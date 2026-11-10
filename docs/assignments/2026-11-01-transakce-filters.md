# Assignment: Filter transactions on the bank-transactions (transakce) page

## 1. Title

Add a client-side filter bar to the admin bank-transactions page to find specific transactions.

## 2. Type

**feature** — adds new filtering capability to an existing screen; no change to existing data, matching, or pairing behavior.

## 3. Summary / Context

The admin transactions page (`/admin/rocniky/<id>/registrace/transakce`) lists all bank transactions for a year (plus globally-unassigned no-VS/unknown-VS rows). Today the only filter is a single client-side **status** (`matchStatus`) dropdown in `bank-transactions-table.tsx`; there is no way to search by sender, amount, or variable symbol, so finding a specific transaction in a long list is hard.

This feature adds a filter bar over the table — name search, amount range, VS, a "without VS" toggle, and a "not paired" toggle — working **client-side** over the already-loaded rows, alongside and combined with the existing status dropdown. **Why:** let an admin quickly locate specific transactions (e.g. reconciling a payment) without scrolling the whole list.

## 4. Scope

**In scope**

- A filter bar on the transakce page's table (`components/admin/bank-transactions-table.tsx`), styled in the builder palette (reuse `builderFieldSx`), containing: name search, amount From, amount To, VS, a "without VS" toggle, a "not paired" toggle.
- Preserving and integrating the **existing** `matchStatus` status dropdown so all filters apply together (AND).
- A filtered-count indicator and a clear-all reset.
- All filtering runs **in the browser** over the rows the page already loads.

**Out of scope**

- Server-side / URL-synced filtering, shareable filter links, persistence across reloads or navigation.
- Pagination, date-range filter, export, or any new column/data.
- Changing the transaction query, matching/sync logic (`payment-matching.ts`, `sync-payments.ts`), the `matchStatus` enum, or the pairing action (`pairTransactionWithOrder`).
- Public pages and any non-visual logic elsewhere.

## 5. Requirements

1. **Search (single input)** — one text input filters to transactions whose `counterpartName` **or** `counterpartAccount` **or** `userMessage` **or** `variableSymbol` (VS) contains the entered text, case-insensitive substring. Empty = no constraint. Rows with null in a field are simply non-matching on that field, not errors.
2. **Amount From** — an optional numeric input; when set, keep only transactions with `amount >= From`. Comparison uses the stored **signed** amount (outgoing/negative included).
3. **Amount To** — an optional numeric input; when set, keep only transactions with `amount <= To` (signed). From/To are independent; either, both, or neither may be set; bounds are inclusive. If From > To the result may legitimately be empty (no special handling required).
4. **VS is part of the single search (no separate input)** — there is **no** dedicated VS field; `variableSymbol` is one of the fields the single search input (R1) matches against. (Revised: the separate VS input was removed per user request.)
5. **Without VS toggle** — when on, keep only transactions whose `variableSymbol` is null/empty. It is an independent filter that combines with the others (AND); it does not disable the search input.
6. **Not paired toggle** — when on, keep only transactions with **no** `orderId` **and** no `submissionId` (not linked to any registration).
7. **Existing status dropdown preserved** — the current `matchStatus` dropdown (ALL + the 8 enum values) remains and continues to work exactly as before.
8. **Combine with AND** — all active filters (R1–R7) narrow the list together; a transaction shows only if it satisfies every active filter. No active filters = full list (current behavior).
9. **Filtered count** — show how many transactions match versus the total (e.g. "X z Y"), near the filter bar, updating live as filters change.
10. **Clear all** — a single control resets every filter (search, amount From/To, both toggles, status) to its default/empty state. It is **always present** (no layout shift) and **disabled** when no filter is active; enabled whenever any filter is active.
11. **Restyle-consistent UI** — the filter bar follows the admin builder-palette design (`.claude/rules/admin-ui-design.md`): inputs via `builderFieldSx`, toggles as palette switches/checkboxes, responsive (no horizontal scroll at phone width). All labels in Czech.
12. **Behavior preservation** — all existing table columns (Datum, Částka, VS, Odesílatel, Stav, Registrace), the pairing button / Detail link, status badges, and current sort (date desc) are unchanged.

## 6. Acceptance Criteria

**Checklist (review)**

- [x] Filter bar present with: single search (matches name/account/message/VS), amount From, amount To, "without VS" toggle, "not paired" toggle, and the existing status dropdown. No separate VS input.
- [x] All filtering is client-side over already-loaded rows; no new network request on filter change.
- [x] The search input also matches by `variableSymbol` (VS folded into the single search).
- [x] Filters combine with AND; clearing all restores the full list.
- [x] Filtered count ("X z Y") shown and live-updating; clear-all is always present, disabled when no filter is active (no layout shift).
- [x] Inputs use `builderFieldSx`; bar matches the builder palette and is responsive; labels in Czech.
- [x] Existing columns, status badges, pairing button/Detail link, and date-desc sort unchanged.

**Given / When / Then**

- **Given** a list with transactions from "Jan Novák" and others, **When** I type "novák" in the search, **Then** only transactions whose name/account/message/VS contains "novák" (case-insensitive) remain, and the count shows matches vs total.
- **Given** a transaction whose VS is "123", **When** I type "123" in the search, **Then** that transaction is matched by its variable symbol (search covers VS).
- **Given** transactions of 50, 150, and 600 CZK and a -200 outgoing, **When** I set From=100 and To=500, **Then** only the 150 CZK transaction remains (signed comparison; -200 and 600 excluded).
- **Given** the "without VS" toggle, **When** I enable it, **Then** only transactions with no variable symbol remain (independent filter; the search input is not disabled).
- **Given** no filter is active, **When** the bar renders, **Then** the clear-all control is present but disabled; it enables once any filter is active and resets everything (and disables again) when clicked.
- **Given** "not paired" is enabled, **When** the list filters, **Then** only transactions with neither `orderId` nor `submissionId` remain (those showing a pairing button, not a Detail link).
- **Given** a name search + amount range + status = OVERPAYMENT all active, **When** applied, **Then** only transactions satisfying all three remain (AND).
- **Given** several active filters, **When** I click clear-all, **Then** every filter resets and the full (status=ALL) list returns.

## 7. Risks

| Risk                                                                    | Category    | Likelihood | Impact | Mitigation                                                                  |
| ----------------------------------------------------------------------- | ----------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Blanket changes to the table clobber the just-completed restyle look    | Correctness | Med        | Med    | Reuse `builderFieldSx`/palette; extend existing filter block, don't rewrite |
| Amount sign confusion (outgoing negatives) yields surprising results    | Correctness | Med        | Med    | R2/R3 fix signed+inclusive semantics; AC covers the -200 case               |
| VS no longer has its own field — users may not realize search covers VS | Usability   | Low        | Low    | Search label names it ("Hledat (jméno, účet, VS, zpráva)"); R1 matches VS   |
| Large transaction volume makes client-side filtering sluggish           | Performance | Low        | Low    | Page already loads all rows; filtering is in-memory array ops               |
| Accessibility regressions (unlabeled inputs, lost focus ring)           | A11y        | Low        | Low    | Czech labels + `builderFieldSx` focus ring in R11                           |

## 8. Open Questions / Assumptions

**Assumptions**

- The page continues to load all year-scoped rows (no pagination); client-side filtering is acceptable for the expected volume.
- "Name" is the `counterpartName`/`counterpartAccount`/`userMessage` set per the interview; no separate contact entity.
- Filters are view-only and need not persist across reload or navigation.

**Open questions:** none (all resolved in interview).

## 9. References

- Page: `app/admin/rocniky/[id]/registrace/transakce/page.tsx` (inline `getAllTransactions`, year-scoping OR clause)
- Table (filter lives here): `components/admin/bank-transactions-table.tsx` (existing client status filter, `statusConfig`, `StatusBadge`)
- Model: `BankTransaction` + `BankTransactionMatchStatus` in `prisma/schema.prisma` (`counterpartName`, `counterpartAccount`, `userMessage`, `amount`, `variableSymbol`, `orderId`, `submissionId`, `matchStatus`)
- Reuse/patterns: `components/admin/builder-field-sx.ts`; `ListFilters` (`components/admin/list-filters.tsx`) and `SubmissionsCountChip` (`components/admin/submissions-count-context.tsx`) as references; design contract `.claude/rules/admin-ui-design.md`
