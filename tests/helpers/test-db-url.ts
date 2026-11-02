import { config } from "dotenv";

// Load env the same way the app does: `.env.local` first, then `.env`.
config({ path: ".env.local" });
config({ path: ".env" });

const TEST_DATABASE_NAME = "helmac_test";

/**
 * Resolve the connection URL for the ISOLATED Playwright test database.
 *
 * Precedence:
 *   1. `TEST_DATABASE_URL` env var, if set (used verbatim).
 *   2. Otherwise derive it from `DATABASE_URL` by swapping the database-name
 *      path segment to `helmac_test` while preserving everything else
 *      (host, port, credentials, `?schema=public`, etc.).
 *
 * This guarantees the E2E suite never runs against the dev database.
 *
 * @throws if neither `TEST_DATABASE_URL` nor `DATABASE_URL` is available.
 */
export function getTestDatabaseUrl(): string {
    const explicit = process.env.TEST_DATABASE_URL;
    if (explicit && explicit.trim() !== "") {
        return explicit;
    }

    const base = process.env.DATABASE_URL;
    if (!base || base.trim() === "") {
        throw new Error(
            "Cannot resolve test database URL: neither TEST_DATABASE_URL " +
                "nor DATABASE_URL is set. Ensure .env.local or .env defines " +
                "DATABASE_URL, or set TEST_DATABASE_URL explicitly."
        );
    }

    const url = new URL(base);
    url.pathname = `/${TEST_DATABASE_NAME}`;
    return url.toString();
}
