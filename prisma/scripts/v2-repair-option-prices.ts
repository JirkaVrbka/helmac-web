/**
 * Repair v2 pricing data affected by the backfill bug.
 *
 * The backfill script (v2-backfill-catalog.ts) had a bug in remapPrices()
 * where non-tiered pricing options (usePriceTiers=false) only got 1 price
 * record (for tier sortOrder=0) instead of one per tier. This caused:
 *
 * 1. v2_pricing_option_prices: missing records for tiers 1+ on non-tiered
 *    options, so v2_current_prices falls back to unitPriceAtSubmission
 *    once tier 0's deadline expires.
 *
 * 2. unitPriceAtSubmission on line items: the backfill used the same broken
 *    tier lookup to set unitPriceAtSubmission, writing 0 for non-tiered
 *    options whose only price record was on an expired tier. This affects
 *    paid orders (where v2_current_prices freezes to the snapshot price).
 *
 * This script fixes both:
 *   Part 1: Fills in missing v2_pricing_option_prices records.
 *   Part 2: Corrects unitPriceAtSubmission on affected line items.
 *
 * Usage: npx tsx prisma/scripts/v2-repair-option-prices.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
    await repairPriceRecords();
    await repairUnitPrices();
}

// ---- Part 1: Fill missing v2_pricing_option_prices ----

async function repairPriceRecords() {
    console.log("=== Part 1: Missing v2_pricing_option_prices ===\n");

    const years = await db.year.findMany({
        where: { registrationForm: { isNot: null } },
        select: {
            id: true,
            year: true,
            registrationForm: { select: { id: true } },
        },
    });

    let totalCreated = 0;

    for (const year of years) {
        const formId = year.registrationForm!.id;

        const tiers = await db.v2PriceTier.findMany({
            where: { formId },
            orderBy: { sortOrder: "asc" },
            select: { id: true, sortOrder: true },
        });

        const options = await db.v2PricingOption.findMany({
            where: {
                definition: { formId },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                definition: {
                    select: {
                        name: true,
                        usePriceTiers: true,
                    },
                },
                prices: {
                    select: {
                        tierId: true,
                        price: true,
                    },
                },
            },
        });

        let yearCreated = 0;

        for (const opt of options) {
            if (opt.prices.length >= tiers.length) continue;

            const existingTierIds = new Set(
                opt.prices.map((p) => p.tierId),
            );
            const referencePrice =
                opt.prices[0]?.price ?? 0;
            const missing =
                tiers.length - opt.prices.length;

            for (const tier of tiers) {
                if (existingTierIds.has(tier.id)) continue;

                if (!dryRun) {
                    await db.v2PricingOptionPrice.create({
                        data: {
                            optionId: opt.id,
                            tierId: tier.id,
                            price: referencePrice,
                        },
                    });
                }
                yearCreated++;
            }

            console.log(
                `  ${dryRun ? "[DRY RUN] " : ""}[${opt.definition.name}] ${opt.name}: +${missing} price records (price=${referencePrice})`,
            );
        }

        if (yearCreated > 0) {
            console.log(
                `Year ${year.year}: created ${yearCreated} missing price records\n`,
            );
        } else {
            console.log(
                `Year ${year.year}: all options OK\n`,
            );
        }
        totalCreated += yearCreated;
    }

    console.log(
        `${dryRun ? "[DRY RUN] Would create" : "Created"} ${totalCreated} price records\n`,
    );
}

// ---- Part 2: Fix unitPriceAtSubmission on line items ----

async function repairUnitPrices() {
    console.log(
        "=== Part 2: Wrong unitPriceAtSubmission on line items ===\n",
    );

    const items = await db.v2OrderLineItem.findMany({
        where: {
            unitPriceAtSubmission: 0,
            pricingOptionId: { not: null },
        },
        select: {
            id: true,
            pricingOptionId: true,
            order: {
                select: {
                    id: true,
                    isPaid: true,
                    legacySubmissionId: true,
                },
            },
            field: { select: { label: true } },
            person: { select: { personIndex: true } },
        },
    });

    const optionPriceCache = new Map<string, number>();

    async function getOptionPrice(
        optionId: string,
    ): Promise<number> {
        if (optionPriceCache.has(optionId)) {
            return optionPriceCache.get(optionId)!;
        }
        const pr =
            await db.v2PricingOptionPrice.findFirst({
                where: { optionId },
                select: { price: true },
            });
        const price = pr?.price ?? 0;
        optionPriceCache.set(optionId, price);
        return price;
    }

    let totalFixed = 0;

    for (const li of items) {
        const correctPrice = await getOptionPrice(
            li.pricingOptionId!,
        );
        if (correctPrice === 0) continue;

        const paidStr = li.order.isPaid
            ? "PAID"
            : "UNPAID";
        console.log(
            `  ${dryRun ? "[DRY RUN] " : ""}${paidStr} P${li.person.personIndex} | ${li.field.label}: 0 → ${correctPrice}`,
        );

        if (!dryRun) {
            await db.v2OrderLineItem.update({
                where: { id: li.id },
                data: {
                    unitPriceAtSubmission: correctPrice,
                },
            });
        }
        totalFixed++;
    }

    console.log(
        `\n${dryRun ? "[DRY RUN] Would fix" : "Fixed"} ${totalFixed} line items\n`,
    );
}


main()
    .catch(console.error)
    .finally(() => db.$disconnect());
