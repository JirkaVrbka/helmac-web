import { test, expect, type Page } from "@playwright/test";
import { db, deleteYearByNumber } from "./helpers/db";
import { loginAsAdmin } from "./helpers/auth";

// Each test reserves a unique year in the 2090-2099 range so parallel real
// data is never touched. The source year copied FROM is the existing 2026.
const SOURCE_YEAR_PATTERN = /2026/;

test.afterAll(async () => {
    await db.$disconnect();
});

/** Navigate to the new-year form, fill identity + (optionally) dates, pick the
 * 2026 source year, and tick one block in the "Info" section type. Leaves the form
 * ready to submit. When `withDates` is false the (required) dates are skipped. */
async function fillNewYearCopyForm(
    page: Page,
    year: number,
    title: string,
    withDates: boolean
): Promise<void> {
    await page.goto("/admin/rocniky/novy", { waitUntil: "networkidle" });

    await page.fill('input[name="year"]', String(year));
    await page.fill('input[name="title"]', title);

    if (withDates) {
        await page.getByRole("group", { name: "Datum začátku" }).click();
        await page.keyboard.type(`01.06.${year}`, { delay: 30 });
        await page.getByRole("group", { name: "Datum konce" }).click();
        await page.keyboard.type(`05.06.${year}`, { delay: 30 });
    }

    // Pick source year (MUI Select) -> 2026.
    await page.getByLabel("Zkopírovat obsah z ročníku").click();
    await page
        .getByRole("option", { name: SOURCE_YEAR_PATTERN })
        .first()
        .click();

    // Wait for the sections UI — each section TYPE is its own accordion now.
    // Expand the "Info" type accordion and tick exactly one section block.
    const infoButton = page.getByRole("button", { name: /^Info \(/ });
    await infoButton.waitFor({ timeout: 15000 });
    await infoButton.click();

    const infoAccordion = page.locator(".MuiAccordion-root", {
        hasText: "Info (",
    });
    // Checkbox index 0 is "Vybrat vše"; index 1 is the first section block.
    await infoAccordion.getByRole("checkbox").nth(1).check();
}

test.describe("new-year copy flow", () => {
    test("copies one selected section type into the new year", async ({
        page,
    }) => {
        const year = 2094;
        await deleteYearByNumber(year);

        await loginAsAdmin(page);
        await fillNewYearCopyForm(page, year, "E2E kopie sekci", true);

        // Sanity-check the hidden inputs that will be submitted.
        const selectionVal = await page.inputValue('input[name="selection"]');
        const selection = JSON.parse(selectionVal);
        expect(selection.sectionIds.length).toBe(1);
        expect(await page.inputValue('input[name="sourceYearId"]')).not.toBe(
            ""
        );
        expect(await page.inputValue('input[name="startDate"]')).not.toBe("");
        expect(await page.inputValue('input[name="endDate"]')).not.toBe("");

        await page.getByRole("button", { name: /Vytvořit ročník/ }).click();

        // Redirect to the created year detail page (not back to /novy).
        await page.waitForURL(
            (url) =>
                /\/admin\/rocniky\/[^/]+$/.test(url.pathname) &&
                !url.pathname.endsWith("/novy"),
            { timeout: 15000 }
        );

        const created = await db.year.findUnique({
            where: { year },
            select: {
                id: true,
                _count: { select: { pages: true } },
                sectionTypes: {
                    select: {
                        label: true,
                        _count: { select: { sections: true } },
                    },
                },
            },
        });

        expect(created).not.toBeNull();
        expect(page.url()).toContain(`/admin/rocniky/${created!.id}`);
        // Exactly one copied section type, labelled "Info", with exactly the
        // one section block that was ticked.
        expect(created!.sectionTypes.length).toBe(1);
        expect(created!.sectionTypes[0].label).toBe("Info");
        expect(created!.sectionTypes[0]._count.sections).toBe(1);
        // The 7 default pages are always created for a new year.
        expect(created!._count.pages).toBe(7);

        await deleteYearByNumber(year);
    });

    test("shows required-date errors instead of silently failing when dates empty", async ({
        page,
    }) => {
        const year = 2095;
        await deleteYearByNumber(year);

        await loginAsAdmin(page);
        // Fill everything EXCEPT the (required) dates.
        await fillNewYearCopyForm(page, year, "E2E chybejici data", false);

        await page.getByRole("button", { name: /Vytvořit ročník/ }).click();

        // Regression guard: before the `noValidate` fix the form silently did
        // nothing. Now it must stay on /novy and surface both date errors.
        await expect(page.getByText("Datum zacatku je povinne")).toBeVisible({
            timeout: 10000,
        });
        await expect(page.getByText("Datum konce je povinne")).toBeVisible({
            timeout: 10000,
        });
        await expect(page).toHaveURL(/\/admin\/rocniky\/novy$/);

        const created = await db.year.findUnique({ where: { year } });
        expect(created).toBeNull();

        await deleteYearByNumber(year);
    });

    test("does not copy photos between years", async ({ page }) => {
        const year = 2096;
        await deleteYearByNumber(year);

        await loginAsAdmin(page);
        await fillNewYearCopyForm(page, year, "E2E bez fotek", true);

        await page.getByRole("button", { name: /Vytvořit ročník/ }).click();
        await page.waitForURL(
            (url) =>
                /\/admin\/rocniky\/[^/]+$/.test(url.pathname) &&
                !url.pathname.endsWith("/novy"),
            { timeout: 15000 }
        );

        const created = await db.year.findUnique({
            where: { year },
            select: { headerPhoto: true, heroPhoto: true },
        });

        expect(created).not.toBeNull();
        // Photos are never copied from the source year — none were uploaded.
        expect(created!.headerPhoto).toBeNull();
        expect(created!.heroPhoto).toBeNull();

        await deleteYearByNumber(year);
    });
});
