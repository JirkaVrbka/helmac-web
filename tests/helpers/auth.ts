import { expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@helmac.cz";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin123456";

/**
 * Log in through the admin credentials form and wait until we land on an admin
 * page that is not the login page.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto("/admin/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin(?!\/login)/);
}
