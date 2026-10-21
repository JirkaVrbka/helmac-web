import { defineConfig, devices } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
        baseURL: "http://localhost:3000",
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
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120000,
    },
});
