/**
 * One-off dev helper: insert varied TEST bank transactions into the local DB
 * so the transakce page + its filters have data to work with.
 *
 * Run:  npx tsx prisma/scripts/seed-test-transactions.ts
 *
 * Targets whatever DATABASE_URL points at (your local `helmac` dev DB). Rows
 * are tagged with fioTransactionId prefix "testdata-" so you can find/remove
 * them later:
 *   DELETE FROM bank_transactions WHERE fio_transaction_id LIKE 'testdata-%';
 * (the matching orders use variable symbols starting "TD".)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type NewTx = {
    fioTransactionId: string;
    daysAgo: number;
    amount: number;
    currency?: string;
    variableSymbol: string | null;
    counterpartAccount: string | null;
    counterpartName: string | null;
    userMessage: string | null;
    matchStatus:
        | "UNPROCESSED"
        | "MATCHED"
        | "PARTIAL_PAYMENT"
        | "OVERPAYMENT"
        | "NO_VARIABLE_SYMBOL"
        | "UNKNOWN_VS"
        | "ALREADY_PAID"
        | "OUTGOING";
    /** Which paired order (by VS) to link, if any. */
    pairVs?: string;
};

function dateDaysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}

async function main() {
    // Target year = the active one (your 2026). Fall back to the known seeded id.
    const year =
        (await db.year.findFirst({ where: { isActive: true } })) ??
        (await db.year.findUnique({
            where: { id: "cmp5i90cj0009mvteio1dnikc" },
        }));
    if (!year) {
        throw new Error("No active year found; cannot attach transactions.");
    }

    const form = await db.registrationForm.findUnique({
        where: { yearId: year.id },
    });
    if (!form) {
        throw new Error(
            `Year ${year.year} has no registration form; cannot create paired orders.`
        );
    }

    console.log(
        `Seeding test transactions into year ${year.year} (${year.id})`
    );

    // 1) A few PAID orders so some transactions can be "paired" (show a Detail
    //    link + be excluded by the "Nespárované" filter). VS prefix "TD".
    const pairedOrders = [
        { variableSymbol: "TD1001", totalPrice: 1500 },
        { variableSymbol: "TD1002", totalPrice: 2000 },
        { variableSymbol: "TD1003", totalPrice: 900 },
    ];
    const vsToOrderId = new Map<string, string>();
    for (const o of pairedOrders) {
        // Clean any prior run's order with this VS (unique), then recreate.
        await db.v2Order.deleteMany({
            where: { variableSymbol: o.variableSymbol },
        });
        const created = await db.v2Order.create({
            data: {
                yearId: year.id,
                formId: form.id,
                status: "CONFIRMED",
                isPaid: true,
                paidAt: new Date(),
                totalPrice: o.totalPrice,
                variableSymbol: o.variableSymbol,
                isTest: true,
            },
        });
        vsToOrderId.set(o.variableSymbol, created.id);
    }

    // 2) Varied transactions covering every filter dimension.
    const rows: NewTx[] = [
        // --- paired (linked to an order) ---
        {
            fioTransactionId: "testdata-01",
            daysAgo: 1,
            amount: 1500,
            variableSymbol: "TD1001",
            counterpartAccount: "123456789/0800",
            counterpartName: "Jan Novák",
            userMessage: "platba registrace",
            matchStatus: "MATCHED",
            pairVs: "TD1001",
        },
        {
            fioTransactionId: "testdata-02",
            daysAgo: 2,
            amount: 2500,
            variableSymbol: "TD1002",
            counterpartAccount: "987654321/0100",
            counterpartName: "Petr Svoboda",
            userMessage: null,
            matchStatus: "OVERPAYMENT",
            pairVs: "TD1002",
        },
        {
            fioTransactionId: "testdata-03",
            daysAgo: 3,
            amount: 400,
            variableSymbol: "TD1003",
            counterpartAccount: "111222333/2010",
            counterpartName: "Marie Dvořáková",
            userMessage: "záloha",
            matchStatus: "PARTIAL_PAYMENT",
            pairVs: "TD1003",
        },

        // --- unpaired, with VS ---
        {
            fioTransactionId: "testdata-04",
            daysAgo: 4,
            amount: 1200,
            variableSymbol: "2026001",
            counterpartAccount: "555666777/0300",
            counterpartName: "Eva Horáková",
            userMessage: null,
            matchStatus: "UNPROCESSED",
        },
        {
            fioTransactionId: "testdata-05",
            daysAgo: 5,
            amount: 800,
            variableSymbol: "2026002",
            counterpartAccount: "444333222/0600",
            counterpartName: "Tomáš Král",
            userMessage: "za oba syny",
            matchStatus: "UNPROCESSED",
        },
        {
            fioTransactionId: "testdata-06",
            daysAgo: 6,
            amount: 1500,
            variableSymbol: "9999999",
            counterpartAccount: "222111000/5500",
            counterpartName: "Lucie Procházková",
            userMessage: null,
            matchStatus: "UNKNOWN_VS",
        },
        {
            fioTransactionId: "testdata-07",
            daysAgo: 7,
            amount: 1500,
            variableSymbol: "2026003",
            counterpartAccount: "333444555/0800",
            counterpartName: "Josef Novotný",
            userMessage: "platba za Janu Novákovou",
            matchStatus: "ALREADY_PAID",
        },
        {
            fioTransactionId: "testdata-08",
            daysAgo: 8,
            amount: 650,
            variableSymbol: "2026004",
            counterpartAccount: "666777888/0100",
            counterpartName: "Anna Veselá",
            userMessage: null,
            matchStatus: "UNPROCESSED",
        },

        // --- without VS (NO_VARIABLE_SYMBOL) ---
        {
            fioTransactionId: "testdata-09",
            daysAgo: 9,
            amount: 1500,
            variableSymbol: null,
            counterpartAccount: "101010101/0800",
            counterpartName: "Martin Beneš",
            userMessage: "Helmac 2026",
            matchStatus: "NO_VARIABLE_SYMBOL",
        },
        {
            fioTransactionId: "testdata-10",
            daysAgo: 10,
            amount: 900,
            variableSymbol: null,
            counterpartAccount: "202020202/0100",
            counterpartName: "Kateřina Marková",
            userMessage: null,
            matchStatus: "NO_VARIABLE_SYMBOL",
        },
        {
            fioTransactionId: "testdata-11",
            daysAgo: 11,
            amount: 1500,
            variableSymbol: null,
            counterpartAccount: "303030303/0300",
            counterpartName: null,
            userMessage: "platba novák rodina",
            matchStatus: "NO_VARIABLE_SYMBOL",
        },

        // --- name only via account (no counterpartName) ---
        {
            fioTransactionId: "testdata-12",
            daysAgo: 12,
            amount: 1100,
            variableSymbol: "2026005",
            counterpartAccount: "404040404/0600",
            counterpartName: null,
            userMessage: null,
            matchStatus: "UNPROCESSED",
        },

        // --- larger / smaller amounts for range testing ---
        {
            fioTransactionId: "testdata-13",
            daysAgo: 13,
            amount: 50,
            variableSymbol: "2026006",
            counterpartAccount: "505050505/0800",
            counterpartName: "Pavel Richter",
            userMessage: null,
            matchStatus: "UNPROCESSED",
        },
        {
            fioTransactionId: "testdata-14",
            daysAgo: 14,
            amount: 3000,
            variableSymbol: "2026007",
            counterpartAccount: "606060606/0100",
            counterpartName: "Veronika Šťastná",
            userMessage: null,
            matchStatus: "UNPROCESSED",
        },
        {
            fioTransactionId: "testdata-15",
            daysAgo: 15,
            amount: 175,
            variableSymbol: "2026008",
            counterpartAccount: "707070707/0300",
            counterpartName: "Jan Novák",
            userMessage: "doplatek",
            matchStatus: "UNPROCESSED",
        },
        {
            fioTransactionId: "testdata-16",
            daysAgo: 16,
            amount: 4500,
            variableSymbol: "2026009",
            counterpartAccount: "808080808/0600",
            counterpartName: "Firma XYZ s.r.o.",
            userMessage: "firemní platba",
            matchStatus: "UNPROCESSED",
        },

        // --- outgoing (negative) ---
        {
            fioTransactionId: "testdata-17",
            daysAgo: 17,
            amount: -200,
            variableSymbol: "2026010",
            counterpartAccount: "909090909/0800",
            counterpartName: "Vratka přeplatku",
            userMessage: "vratka",
            matchStatus: "OUTGOING",
        },
        {
            fioTransactionId: "testdata-18",
            daysAgo: 18,
            amount: -1000,
            variableSymbol: null,
            counterpartAccount: "121212121/0100",
            counterpartName: "Dodavatel A",
            userMessage: null,
            matchStatus: "OUTGOING",
        },

        // --- a couple more unpaired for volume ---
        {
            fioTransactionId: "testdata-19",
            daysAgo: 19,
            amount: 1500,
            variableSymbol: "2026011",
            counterpartAccount: "131313131/0300",
            counterpartName: "Michaela Kučerová",
            userMessage: null,
            matchStatus: "UNPROCESSED",
        },
        {
            fioTransactionId: "testdata-20",
            daysAgo: 20,
            amount: 1350,
            variableSymbol: "2026012",
            counterpartAccount: "141414141/0600",
            counterpartName: "Ondřej Pokorný",
            userMessage: "za dceru",
            matchStatus: "UNPROCESSED",
        },
    ];

    // Clean any previous run's test rows (by prefix) so this is idempotent.
    await db.bankTransaction.deleteMany({
        where: { fioTransactionId: { startsWith: "testdata-" } },
    });

    await db.bankTransaction.createMany({
        data: rows.map((r) => ({
            fioTransactionId: r.fioTransactionId,
            yearId: year.id,
            date: dateDaysAgo(r.daysAgo),
            amount: r.amount,
            currency: r.currency ?? "CZK",
            variableSymbol: r.variableSymbol,
            counterpartAccount: r.counterpartAccount,
            counterpartName: r.counterpartName,
            userMessage: r.userMessage,
            matchStatus: r.matchStatus,
            orderId: r.pairVs ? (vsToOrderId.get(r.pairVs) ?? null) : null,
        })),
    });

    const total = await db.bankTransaction.count({
        where: { fioTransactionId: { startsWith: "testdata-" } },
    });
    console.log(
        `Done. Inserted ${total} test transactions (${vsToOrderId.size} paired to orders).`
    );
}

main()
    .catch((e) => {
        console.error("Failed to seed test transactions:", e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
