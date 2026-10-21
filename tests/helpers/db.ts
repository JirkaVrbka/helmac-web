import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load env the same way the app does: `.env.local` first, then `.env`.
config({ path: ".env.local" });
config({ path: ".env" });

// NOTE: These E2E tests run against the normal dev database and are
// "self-cleaning" — every spec reserves a unique year in the 2090-2099 range
// and deletes it before and after the test, so it never interferes with real
// data. A dedicated test DB would be cleaner but this keeps setup trivial.
export const db = new PrismaClient();

/**
 * Delete every year row matching `year` (cascades to child content). Used for
 * pre-clean before a test and teardown after it.
 */
export async function deleteYearByNumber(year: number): Promise<void> {
    await db.year.deleteMany({ where: { year } });
}
