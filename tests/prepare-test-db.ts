import { execFileSync, execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { getTestDatabaseUrl } from "./helpers/test-db-url";

/**
 * Mask the password in a Postgres connection URL for safe logging.
 */
function maskDbUrl(raw: string): string {
    try {
        const url = new URL(raw);
        if (url.password) {
            url.password = "***";
        }
        return url.toString();
    } catch {
        return "<unparseable DATABASE_URL>";
    }
}

/**
 * Prepare the ISOLATED Playwright test database before the run.
 *
 * This runs as a standalone pre-step (`tsx tests/prepare-test-db.ts`) BEFORE
 * Playwright starts, so the webServer (next dev on :3100) finds `helmac_test`
 * already created and answers 200 instead of 500. Running it as a Playwright
 * `globalSetup` deadlocked, because this Playwright version awaits webServer
 * readiness BEFORE globalSetup runs.
 *
 * Steps (both targeting the test DB via a scoped DATABASE_URL):
 *   1. `prisma db push` — Prisma auto-creates `helmac_test` if it does not yet
 *      exist and syncs the schema to it.
 *   2. `prisma db seed` — wipes + seeds the baseline fixtures (year 2026, the
 *      admin user, etc.) the specs rely on.
 *
 * Either command failing throws, which exits the process non-zero and aborts
 * the whole test run before Playwright starts.
 */
async function main(): Promise<void> {
    const testUrl = getTestDatabaseUrl();
    // Set BOTH datasource vars the schema references (url + directUrl) to the
    // test DB, so nothing falls back to the dev database.
    const env = {
        ...process.env,
        DATABASE_URL: testUrl,
        DIRECT_URL: testUrl,
    };
    const projectRoot = process.cwd();
    const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
    const prismaBin = path.join(projectRoot, "node_modules", ".bin", "prisma");

    console.log(
        `[prepare-test-db] Preparing test database: ${maskDbUrl(testUrl)}`
    );

    // `prisma db push`: run from a temp cwd with an absolute --schema so the
    // Prisma CLI cannot find the dev `.env` (whose DATABASE_URL would otherwise
    // OVERRIDE the env var we pass here) and instead uses DATABASE_URL/DIRECT_URL
    // from `env` below. It auto-creates `helmac_test` if missing, then syncs the
    // schema. Invoke the local binary directly (absolute path) so the temp cwd
    // can still resolve Prisma.
    console.log("[prepare-test-db] Running: prisma db push");
    execFileSync(
        prismaBin,
        [
            "db",
            "push",
            "--schema",
            schemaPath,
            "--skip-generate",
            "--accept-data-loss",
        ],
        { cwd: os.tmpdir(), env, stdio: "inherit" }
    );

    // `prisma db seed` from the project root (needs the package.json
    // `prisma.seed` config). Its ts-node PrismaClient reads DATABASE_URL from
    // `env`, which is honored for the spawned seed process.
    console.log("[prepare-test-db] Running: prisma db seed");
    execSync("npx prisma db seed", {
        cwd: projectRoot,
        env,
        stdio: "inherit",
    });

    console.log("[prepare-test-db] Test database ready.");
}

main().catch((error) => {
    console.error("[prepare-test-db] Failed to prepare test database:", error);
    process.exitCode = 1;
});
