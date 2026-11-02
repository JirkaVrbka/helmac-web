import { PrismaClient } from "@prisma/client";
import { getTestDatabaseUrl } from "./test-db-url";

// NOTE: These E2E tests run against the ISOLATED `helmac_test` database (see
// `getTestDatabaseUrl`), never the dev database, so they can never touch real
// data. Specs are additionally "self-cleaning" — every spec reserves a unique
// year in the 2090-2099 range and deletes it before and after the test — which
// keeps the test DB tidy across runs even though it targets the test DB only.
export const db = new PrismaClient({
    datasources: { db: { url: getTestDatabaseUrl() } },
});

/**
 * Delete every year row matching `year` (cascades to child content). Used for
 * pre-clean before a test and teardown after it.
 */
export async function deleteYearByNumber(year: number): Promise<void> {
    await db.year.deleteMany({ where: { year } });
}
