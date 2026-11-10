import { defineConfig, devices } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getTestDatabaseUrl } from "./tests/helpers/test-db-url";

/**
 * Resolve a working Chromium executable portably.
 *
 * On this host Playwright's bundled browser revision is NOT downloaded
 * (downloads are blocked), but a compatible full Chromium build is cached under
 * `~/.cache/ms-playwright/chromium-<rev>/chrome-linux64/chrome`. We glob those
 * dirs and pick the newest revision. An explicit `PW_CHROMIUM_PATH` overrides.
 * If nothing is found we return undefined so Playwright falls back to default.
 */
function resolveChromiumPath(): string | undefined {
    const override = process.env.PW_CHROMIUM_PATH;
    if (override && existsSync(override)) {
        return override;
    }

    const cacheDir = join(homedir(), ".cache", "ms-playwright");
    if (!existsSync(cacheDir)) {
        return undefined;
    }

    const candidates = readdirSync(cacheDir)
        .map((name) => {
            const match = /^chromium-(\d+)$/.exec(name);
            if (!match) {
                return null;
            }
            return {
                rev: Number(match[1]),
                path: join(cacheDir, name, "chrome-linux64", "chrome"),
            };
        })
        .filter(
            (c): c is { rev: number; path: string } =>
                c !== null && existsSync(c.path)
        )
        .sort((a, b) => b.rev - a.rev);

    return candidates[0]?.path;
}

const TEST_DATABASE_URL = getTestDatabaseUrl();

export default defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.ts",
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    reporter: "list",
    use: {
        baseURL: "http://localhost:3100",
        headless: true,
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                launchOptions: {
                    executablePath: resolveChromiumPath(),
                },
            },
        },
    ],
    webServer: {
        // Dedicated server for E2E on port 3100, pointed at the ISOLATED test
        // DB so the app-under-test never reads/writes the dev database.
        command: "npx next dev -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: false,
        timeout: 120000,
        env: {
            ...process.env,
            DATABASE_URL: TEST_DATABASE_URL,
            // Isolated build dir so this server does not collide with a running
            // dev server's `.next/dev/lock`.
            NEXT_DIST_DIR: ".next-test",
        },
    },
});
