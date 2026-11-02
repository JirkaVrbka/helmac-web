import { test, expect, type Page } from "@playwright/test";
import { db } from "./helpers/db";
import { loginAsAdmin } from "./helpers/auth";

/**
 * E2E coverage for the client-side filter bar on the admin bank-transactions
 * ("transakce") page — assignment docs/assignments/2026-11-01-transakce-filters.md,
 * section 6 Given / When / Then.
 *
 * No bank transactions are seeded, so this spec plants its own controlled set
 * under the seeded 2026 year and removes them (plus one helper V2Order and, if
 * it had to create one, a RegistrationForm) in afterAll. All planted rows share
 * the `e2e-txf-` fioTransactionId prefix for easy cleanup. Assertions are scoped
 * to the planted rows' unique names so other data under 2026 can't break them.
 */

const FIO_PREFIX = "e2e-txf-";

// Unique, stable counterpart names used to assert row presence/absence.
const NAME_NOVAK = "Jan Novák E2E";
const NAME_SVOBODA = "Petr Svoboda E2E";
const NAME_FIRMA = "Firma XYZ E2E";
const NAME_OUTGOING = "Odchozí Platba E2E";
const NAME_NOVS = "Bez Symbolu E2E";
const NAME_MESSAGE = "Marie Dvořák E2E"; // name has NO "novák"; message does
const NAME_PAIRED = "Spárovaná Platba E2E";
const NAME_OVERPAYMENT = "Jan Novák Přeplatek E2E";

let yearId: string | null = null;
let createdOrderId: string | null = null;
let createdFormId: string | null = null; // only set when we had to create one

test.afterAll(async () => {
    // Remove planted transactions first (orderId FK is onDelete: SetNull, so
    // order can go either side — but this keeps intent explicit).
    await db.bankTransaction.deleteMany({
        where: { fioTransactionId: { startsWith: FIO_PREFIX } },
    });
    if (createdOrderId) {
        await db.v2Order.deleteMany({ where: { id: createdOrderId } });
    }
    if (createdFormId) {
        await db.registrationForm.deleteMany({ where: { id: createdFormId } });
    }
    await db.$disconnect();
});

test.beforeAll(async () => {
    const year = await db.year.findUnique({ where: { year: 2026 } });
    if (!year) {
        // yearId stays null → every test skips with a clear message.
        return;
    }
    yearId = year.id;

    // Clean any leftover planted rows from a previous aborted run.
    await db.bankTransaction.deleteMany({
        where: { fioTransactionId: { startsWith: FIO_PREFIX } },
    });

    // The PAIRED row needs a real FK. V2Order has the fewest required fields
    // (yearId + formId; id is db-generated), and setting orderId also renders
    // the "Detail" link the AC references. A RegistrationForm (yearId @unique)
    // is required for the order — reuse the year's form if present, else create
    // a throwaway one and track it for cleanup.
    const existingForm = await db.registrationForm.findFirst({
        where: { yearId },
        select: { id: true },
    });
    let formId: string;
    if (existingForm) {
        formId = existingForm.id;
    } else {
        const form = await db.registrationForm.create({
            data: { yearId, fields: [] },
            select: { id: true },
        });
        formId = form.id;
        createdFormId = form.id;
    }

    const order = await db.v2Order.create({
        data: { yearId, formId },
        select: { id: true },
    });
    createdOrderId = order.id;

    // Distinct descending dates so order is deterministic (page sorts date desc).
    const base = new Date("2026-03-01T10:00:00.000Z").getTime();
    const day = (n: number) => new Date(base - n * 86_400_000);

    await db.bankTransaction.createMany({
        data: [
            {
                fioTransactionId: `${FIO_PREFIX}1`,
                yearId,
                date: day(0),
                amount: 150,
                currency: "CZK",
                variableSymbol: "123",
                counterpartName: NAME_NOVAK,
                matchStatus: "UNPROCESSED",
            },
            {
                fioTransactionId: `${FIO_PREFIX}2`,
                yearId,
                date: day(1),
                amount: 50,
                currency: "CZK",
                variableSymbol: "456",
                counterpartName: NAME_SVOBODA,
                matchStatus: "UNPROCESSED",
            },
            {
                fioTransactionId: `${FIO_PREFIX}3`,
                yearId,
                date: day(2),
                amount: 600,
                currency: "CZK",
                variableSymbol: "789",
                counterpartName: NAME_FIRMA,
                matchStatus: "UNPROCESSED",
            },
            {
                fioTransactionId: `${FIO_PREFIX}4`,
                yearId,
                date: day(3),
                amount: -200,
                currency: "CZK",
                variableSymbol: "999",
                counterpartName: NAME_OUTGOING,
                matchStatus: "OUTGOING",
            },
            {
                fioTransactionId: `${FIO_PREFIX}5`,
                yearId,
                date: day(4),
                amount: 300,
                currency: "CZK",
                variableSymbol: null, // null VS row for the "Bez VS" test
                counterpartName: NAME_NOVS,
                matchStatus: "NO_VARIABLE_SYMBOL",
            },
            {
                fioTransactionId: `${FIO_PREFIX}6`,
                yearId,
                date: day(5),
                amount: 175,
                currency: "CZK",
                variableSymbol: "321",
                counterpartName: NAME_MESSAGE, // "Dvořák" does NOT contain "novák"
                userMessage: "platba od novák rodina", // message does → proves search
                matchStatus: "UNPROCESSED",
            },
            {
                fioTransactionId: `${FIO_PREFIX}7`,
                yearId,
                date: day(6),
                amount: 400,
                currency: "CZK",
                variableSymbol: "555",
                counterpartName: NAME_PAIRED,
                matchStatus: "MATCHED",
                orderId: createdOrderId, // PAIRED → excluded by "Nespárované"
            },
            {
                fioTransactionId: `${FIO_PREFIX}8`,
                yearId,
                date: day(7),
                amount: 250,
                currency: "CZK",
                variableSymbol: "246",
                counterpartName: NAME_OVERPAYMENT, // contains "novák", amount in range
                matchStatus: "OVERPAYMENT", // for the 3-way AND test
            },
        ],
    });
});

/** Number of visible table rows whose text contains `text`. */
function rowsWith(page: Page, text: string) {
    return page.getByTestId("tx-row").filter({ hasText: text }).count();
}

/** Parse the "X z Y" count indicator. */
async function readCount(page: Page): Promise<{ x: number; y: number }> {
    const raw = (await page.getByTestId("tx-filter-count").textContent()) ?? "";
    const m = /(\d+)\s*z\s*(\d+)/.exec(raw);
    expect(m, `count indicator "${raw}" should match "X z Y"`).not.toBeNull();
    return { x: Number(m![1]), y: Number(m![2]) };
}

/** Log in, open the transakce page, and wait until the planted rows render. */
async function openTransakce(page: Page): Promise<void> {
    await loginAsAdmin(page);
    await page.goto(`/admin/rocniky/${yearId}/registrace/transakce`, {
        waitUntil: "networkidle",
    });
    // Our 8 planted rows guarantee a non-empty table; wait for one to appear.
    await page
        .getByTestId("tx-row")
        .filter({ hasText: NAME_NOVAK })
        .first()
        .waitFor({ timeout: 15000 });
}

/** Open the MUI status Select and pick the option with the given Czech label. */
async function selectStatus(page: Page, optionLabel: string): Promise<void> {
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: optionLabel }).click();
}

test.describe("transakce filters", () => {
    test("name search matches name/account/message, count updates", async ({
        page,
    }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        // With no filters the count shows the full total (X === Y) and equals
        // the number of rendered rows.
        const baseline = await readCount(page);
        expect(baseline.x).toBe(baseline.y);
        expect(await page.getByTestId("tx-row").count()).toBe(baseline.x);

        await page.getByTestId("tx-filter-name").fill("novák");

        // Name-match rows remain; non-matching planted rows disappear.
        expect(await rowsWith(page, NAME_NOVAK)).toBe(1);
        expect(await rowsWith(page, NAME_OVERPAYMENT)).toBe(1);
        // Dvořák's name has no "novák" but its userMessage does → stays visible.
        expect(await rowsWith(page, NAME_MESSAGE)).toBe(1);
        expect(await rowsWith(page, NAME_SVOBODA)).toBe(0);
        expect(await rowsWith(page, NAME_FIRMA)).toBe(0);

        // Count live-updated: still the same total Y, fewer matches X, and X
        // equals the number of visible rows.
        const filtered = await readCount(page);
        expect(filtered.y).toBe(baseline.y);
        expect(filtered.x).toBeLessThan(baseline.x);
        expect(await page.getByTestId("tx-row").count()).toBe(filtered.x);
    });

    test("amount range uses signed inclusive bounds", async ({ page }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        await page.getByTestId("tx-filter-amount-from").fill("100");
        await page.getByTestId("tx-filter-amount-to").fill("500");

        // 150 is in range; 50, 600 and the -200 outgoing are excluded (signed).
        expect(await rowsWith(page, NAME_NOVAK)).toBe(1); // 150
        expect(await rowsWith(page, NAME_SVOBODA)).toBe(0); // 50
        expect(await rowsWith(page, NAME_FIRMA)).toBe(0); // 600
        expect(await rowsWith(page, NAME_OUTGOING)).toBe(0); // -200

        // Count reflects the visible rows.
        const { x } = await readCount(page);
        expect(await page.getByTestId("tx-row").count()).toBe(x);
    });

    test('"Bez VS" keeps only null-VS rows', async ({ page }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        await page
            .getByTestId("tx-filter-without-vs")
            .getByRole("checkbox")
            .check();

        // Only null/empty-VS rows remain: the planted null-VS row stays, a
        // VS-bearing one is gone.
        expect(await rowsWith(page, NAME_NOVS)).toBe(1);
        expect(await rowsWith(page, NAME_NOVAK)).toBe(0);

        const { x } = await readCount(page);
        expect(await page.getByTestId("tx-row").count()).toBe(x);
    });

    test("fulltext search also matches by variable symbol", async ({
        page,
    }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        // VS "123" is unique to the Novák row (no other planted VS/name/message
        // contains "123") → searching it in the name field isolates that row.
        await page.getByTestId("tx-filter-name").fill("123");

        expect(await rowsWith(page, NAME_NOVAK)).toBe(1);
        expect(await rowsWith(page, NAME_SVOBODA)).toBe(0);
        expect(await rowsWith(page, NAME_FIRMA)).toBe(0);

        const { x } = await readCount(page);
        expect(x).toBe(1);
        expect(await page.getByTestId("tx-row").count()).toBe(1);
    });

    test('"Nespárované" hides rows linked to an order/submission', async ({
        page,
    }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        await page
            .getByTestId("tx-filter-not-paired")
            .getByRole("checkbox")
            .check();

        // The paired row (orderId set) disappears; unpaired ones remain.
        expect(await rowsWith(page, NAME_PAIRED)).toBe(0);
        expect(await rowsWith(page, NAME_NOVAK)).toBe(1);

        const { x } = await readCount(page);
        expect(await page.getByTestId("tx-row").count()).toBe(x);
    });

    test("name + amount range + status combine with AND", async ({ page }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        await page.getByTestId("tx-filter-name").fill("novák");
        await page.getByTestId("tx-filter-amount-from").fill("100");
        await page.getByTestId("tx-filter-amount-to").fill("500");
        await selectStatus(page, "Přeplatek"); // OVERPAYMENT

        // Only the OVERPAYMENT row named "...Novák..." with amount 250 satisfies
        // all three constraints.
        expect(await rowsWith(page, NAME_OVERPAYMENT)).toBe(1);
        // Fails status (UNPROCESSED) though it matches name + range.
        expect(await rowsWith(page, NAME_NOVAK)).toBe(0);
        // Matches name-via-message + range but fails status.
        expect(await rowsWith(page, NAME_MESSAGE)).toBe(0);

        const { x } = await readCount(page);
        expect(await page.getByTestId("tx-row").count()).toBe(x);
    });

    test("clear-all resets every filter and restores the full list", async ({
        page,
    }) => {
        test.skip(
            yearId === null,
            "Seeded year 2026 not found in the database"
        );
        await openTransakce(page);

        const baseline = await readCount(page);

        // Clear-all is always mounted but disabled while no filter is active.
        await expect(page.getByTestId("tx-filter-clear")).toBeDisabled();

        // Activate several filters.
        await page.getByTestId("tx-filter-name").fill("novák");
        await page.getByTestId("tx-filter-amount-from").fill("100");
        await page
            .getByTestId("tx-filter-not-paired")
            .getByRole("checkbox")
            .check();
        await selectStatus(page, "Přeplatek");

        // Clear-all becomes enabled once filters are active.
        await expect(page.getByTestId("tx-filter-clear")).toBeEnabled();
        await page.getByTestId("tx-filter-clear").click();

        // Full list returns: all planted rows visible again.
        for (const name of [
            NAME_NOVAK,
            NAME_SVOBODA,
            NAME_FIRMA,
            NAME_OUTGOING,
            NAME_NOVS,
            NAME_MESSAGE,
            NAME_PAIRED,
            NAME_OVERPAYMENT,
        ]) {
            expect(await rowsWith(page, name), `${name} visible`).toBe(1);
        }

        // Count back to the full total and the clear button is disabled again.
        const restored = await readCount(page);
        expect(restored.x).toBe(restored.y);
        expect(restored.x).toBe(baseline.x);
        await expect(page.getByTestId("tx-filter-clear")).toBeDisabled();
    });
});
