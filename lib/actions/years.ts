"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireEditor } from "@/lib/auth";
import {
    createYearSchema,
    updateYearSchema,
    updateEmailTemplateSchema,
    createYearWithReuseSchema,
} from "@/lib/validators/year";
import { parseEmailConditionalSectionsJson } from "@/lib/validators/email-section";
import { parseEmailAttachmentsJson } from "@/lib/validators/email-attachment";
import { contentBlocksSchema } from "@/lib/validators/content-blocks";
import {
    syncYearEmailToV2,
    toggleYearEmailInV2,
} from "@/lib/utils/v2-dual-write";
import {
    computeDeltaMs,
    shiftDate,
    copyYearContent,
} from "@/lib/utils/year-copy";
import {
    getYearCopyInventory,
    type YearCopyInventory,
} from "@/lib/services/year-copy-inventory";

export type YearActionState = {
    error?: {
        year?: string[];
        title?: string[];
        subtitle?: string[];
        startDate?: string[];
        endDate?: string[];
        headerPhoto?: string[];
        heroPhoto?: string[];
        anchorStartDate?: string[];
        sourceYearId?: string[];
        _form?: string[];
    };
    success?: boolean;
} | null;

export async function loadYearCopyInventory(
    sourceYearId: string
): Promise<YearCopyInventory | null> {
    try {
        await requireAdmin();
        return await getYearCopyInventory(sourceYearId);
    } catch {
        return null;
    }
}

export async function createYear(
    prevState: YearActionState,
    formData: FormData
): Promise<YearActionState> {
    try {
        await requireAdmin();
    } catch {
        return { error: { _form: ["Nemáte oprávnění"] } };
    }

    // Unified entry: when a source year is picked, branch into the
    // content-reuse path; otherwise create a blank year.
    const sourceYearId = formData.get("sourceYearId") as string | null;
    if (sourceYearId) {
        return createYearWithReuse(prevState, formData);
    }

    const rawData = {
        year: formData.get("year"),
        title: formData.get("title"),
        subtitle: formData.get("subtitle") || undefined,
        startDate: formData.get("startDate") || undefined,
        endDate: formData.get("endDate") || undefined,
        headerPhoto: formData.get("headerPhoto") || undefined,
        heroPhoto: formData.get("heroPhoto") || undefined,
    };

    const validated = createYearSchema.safeParse(rawData);

    if (!validated.success) {
        return { error: validated.error.flatten().fieldErrors };
    }

    try {
        // Check if year already exists
        const existing = await db.year.findUnique({
            where: { year: validated.data.year },
        });

        if (existing) {
            return { error: { year: ["Tento ročník již existuje"] } };
        }

        const year = await db.year.create({
            data: {
                year: validated.data.year,
                title: validated.data.title,
                subtitle: validated.data.subtitle,
                startDate: validated.data.startDate,
                endDate: validated.data.endDate,
                headerPhoto: validated.data.headerPhoto,
                heroPhoto: validated.data.heroPhoto,
            },
        });

        // Create default pages for new year
        await createDefaultPages(year.id);

        revalidatePath("/admin/rocniky");
    } catch (error) {
        console.error("Failed to create year:", error);
        return { error: { _form: ["Nepodařilo se vytvořit ročník"] } };
    }

    redirect("/admin/rocniky");
}

async function createYearWithReuse(
    prevState: YearActionState,
    formData: FormData
): Promise<YearActionState> {
    try {
        await requireAdmin();
    } catch {
        return { error: { _form: ["Nemáte oprávnění"] } };
    }

    let selectionRaw: unknown;
    try {
        selectionRaw = JSON.parse(
            (formData.get("selection") as string | null) ?? "{}"
        );
    } catch {
        return { error: { _form: ["Neplatný výběr obsahu"] } };
    }

    const rawData = {
        year: formData.get("year"),
        title: formData.get("title"),
        subtitle: formData.get("subtitle") || undefined,
        startDate: formData.get("startDate") || undefined,
        endDate: formData.get("endDate") || undefined,
        anchorStartDate: formData.get("anchorStartDate") || undefined,
        sourceYearId: formData.get("sourceYearId"),
        headerPhoto: formData.get("headerPhoto") || undefined,
        heroPhoto: formData.get("heroPhoto") || undefined,
        selection: selectionRaw,
    };

    const validated = createYearWithReuseSchema.safeParse(rawData);

    if (!validated.success) {
        return { error: validated.error.flatten().fieldErrors };
    }

    const {
        year,
        title,
        subtitle,
        startDate,
        endDate,
        anchorStartDate,
        sourceYearId,
        selection,
    } = validated.data;

    const source = await db.year.findUnique({
        where: { id: sourceYearId },
        select: {
            startDate: true,
            registrationSuccessContent: true,
            registrationStartDate: true,
        },
    });

    if (!source) {
        return { error: { _form: ["Zdrojový ročník nenalezen"] } };
    }

    // Program days and the registration form (price tiers, deadlines) carry
    // real dates, so a shift (deltaMs) only needs to be computed when at
    // least one of them is actually being copied.
    const copiesDatedContent =
        selection.programDayIds.length > 0 || selection.copyRegistrationForm;

    let deltaMs = 0;
    if (copiesDatedContent) {
        const anchor = source.startDate ?? anchorStartDate ?? null;
        if (!anchor) {
            return {
                error: {
                    anchorStartDate: ["Zadejte začátek zdrojového ročníku"],
                },
            };
        }
        deltaMs = computeDeltaMs(anchor, startDate);
    }

    const existing = await db.year.findUnique({ where: { year } });
    if (existing) {
        return { error: { year: ["Tento ročník již existuje"] } };
    }

    let newYearId: string;
    try {
        newYearId = await db.$transaction(
            async (tx) => {
                const newYear = await tx.year.create({
                    data: {
                        year,
                        title,
                        subtitle,
                        startDate,
                        endDate,
                        headerPhoto: validated.data.headerPhoto,
                        heroPhoto: validated.data.heroPhoto,
                        registrationSuccessContent: selection.copySuccessContent
                            ? (source.registrationSuccessContent as Prisma.InputJsonValue)
                            : undefined,
                        registrationStartDate:
                            selection.copyRegistrationForm &&
                            source.registrationStartDate
                                ? shiftDate(
                                      source.registrationStartDate,
                                      deltaMs
                                  )
                                : undefined,
                    },
                });

                await copyYearContent(tx, {
                    sourceYearId,
                    newYearId: newYear.id,
                    selection,
                    deltaMs,
                });

                // Pages are no longer part of the copy selection, so every
                // reused year gets the default pages, same as a blank year.
                await createDefaultPages(newYear.id, tx);

                return newYear.id;
            },
            { timeout: 30000 }
        );
    } catch (error) {
        console.error("Failed to create year with reuse:", error);
        return { error: { _form: ["Nepodařilo se vytvořit ročník"] } };
    }

    revalidatePath("/admin/rocniky");
    redirect(`/admin/rocniky/${newYearId}`);
}

export async function updateYear(
    yearId: string,
    prevState: YearActionState,
    formData: FormData
): Promise<YearActionState> {
    try {
        await requireAdmin();
    } catch {
        return { error: { _form: ["Nemáte oprávnění"] } };
    }

    const rawData = {
        year: formData.get("year"),
        title: formData.get("title"),
        subtitle: formData.get("subtitle") || undefined,
        startDate: formData.get("startDate") || undefined,
        endDate: formData.get("endDate") || undefined,
        headerPhoto: formData.get("headerPhoto") || undefined,
        heroPhoto: formData.get("heroPhoto") || undefined,
    };

    const validated = updateYearSchema.safeParse(rawData);

    if (!validated.success) {
        return { error: validated.error.flatten().fieldErrors };
    }

    try {
        // Check if changing year number and if it conflicts
        if (validated.data.year) {
            const existing = await db.year.findFirst({
                where: {
                    year: validated.data.year,
                    NOT: { id: yearId },
                },
            });

            if (existing) {
                return { error: { year: ["Tento ročník již existuje"] } };
            }
        }

        await db.year.update({
            where: { id: yearId },
            data: {
                year: validated.data.year,
                title: validated.data.title,
                subtitle: validated.data.subtitle,
                startDate: validated.data.startDate,
                endDate: validated.data.endDate,
                headerPhoto: validated.data.headerPhoto,
                heroPhoto: validated.data.heroPhoto,
            },
        });

        revalidatePath("/admin/rocniky");
        revalidatePath(`/admin/rocniky/${yearId}`);
        revalidatePath(`/admin/rocniky/${yearId}/nastaveni`);
        revalidatePath("/");
    } catch (error) {
        console.error("Failed to update year:", error);
        return { error: { _form: ["Nepodařilo se upravit ročník"] } };
    }

    redirect(`/admin/rocniky/${yearId}/nastaveni`);
}

export async function setActiveYear(yearId: string) {
    try {
        await requireAdmin();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        await db.$transaction([
            // Deactivate all years
            db.year.updateMany({
                data: { isActive: false },
            }),
            // Activate selected year
            db.year.update({
                where: { id: yearId },
                data: { isActive: true, isArchived: false },
            }),
        ]);

        revalidatePath("/");
        revalidatePath("/admin/rocniky");
        return { success: true };
    } catch (error) {
        console.error("Failed to set active year:", error);
        return { error: "Nepodařilo se aktivovat ročník" };
    }
}

export async function archiveYear(yearId: string) {
    try {
        await requireAdmin();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        const year = await db.year.findUnique({ where: { id: yearId } });

        if (year?.isActive) {
            return { error: "Nelze archivovat aktivní ročník" };
        }

        await db.year.update({
            where: { id: yearId },
            data: { isArchived: true },
        });

        revalidatePath("/admin/rocniky");
        revalidatePath("/archiv");
        return { success: true };
    } catch (error) {
        console.error("Failed to archive year:", error);
        return { error: "Nepodařilo se archivovat ročník" };
    }
}

export async function unarchiveYear(yearId: string) {
    try {
        await requireAdmin();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        await db.year.update({
            where: { id: yearId },
            data: { isArchived: false },
        });

        revalidatePath("/admin/rocniky");
        return { success: true };
    } catch (error) {
        console.error("Failed to unarchive year:", error);
        return { error: "Nepodařilo se obnovit ročník" };
    }
}

export async function deleteYear(yearId: string) {
    try {
        await requireAdmin();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        const year = await db.year.findUnique({ where: { id: yearId } });

        if (year?.isActive) {
            return { error: "Nelze smazat aktivní ročník" };
        }

        await db.year.delete({
            where: { id: yearId },
        });

        revalidatePath("/admin/rocniky");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete year:", error);
        return { error: "Nepodařilo se smazat ročník" };
    }
}

export async function toggleRegistration(yearId: string, open: boolean) {
    try {
        await requireAdmin();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        // Server-side constraint check when opening registration
        if (open) {
            const [mainEmail, bankAccount] = await Promise.all([
                db.emailAccount.findFirst({ where: { isMain: true } }),
                db.bankAccount.findFirst({
                    where: { bankAccountNumber: { not: null } },
                }),
            ]);

            const missing: string[] = [];
            if (!mainEmail) missing.push("hlavní emailová adresa");
            if (!bankAccount) missing.push("bankovní účet");

            if (missing.length > 0) {
                return {
                    error: `Nelze otevřít registraci. Chybí: ${missing.join(", ")}`,
                };
            }
        }

        await db.year.update({
            where: { id: yearId },
            data: { registrationOpen: open },
        });

        revalidatePath("/admin/rocniky");
        revalidatePath(`/admin/rocniky/${yearId}`);
        revalidatePath("/");
        revalidatePath("/registrace");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle registration:", error);
        return { error: "Nepodařilo se změnit stav registrace" };
    }
}

export async function updateRegistrationStartDate(
    yearId: string,
    date: string | null
) {
    try {
        await requireAdmin();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        await db.year.update({
            where: { id: yearId },
            data: {
                registrationStartDate: date ? new Date(date) : null,
            },
        });

        revalidatePath("/admin/rocniky");
        revalidatePath(`/admin/rocniky/${yearId}`);
        revalidatePath("/");
        revalidatePath("/registrace");
        return { success: true };
    } catch (error) {
        console.error("Failed to update registration start date:", error);
        return { error: "Nepodařilo se uložit datum otevření registrace" };
    }
}

export async function updateEmailTemplate(yearId: string, formData: FormData) {
    try {
        await requireEditor();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    const rawData = {
        confirmationEmailSubject:
            formData.get("confirmationEmailSubject") || "",
        confirmationEmailBody: formData.get("confirmationEmailBody") || "",
        confirmationEmailBcc: formData.get("confirmationEmailBcc") || null,
        emailAccountId: formData.get("emailAccountId") || null,
    };

    const validated = updateEmailTemplateSchema.safeParse(rawData);
    if (!validated.success) {
        return { error: validated.error.flatten().fieldErrors };
    }

    let sections;
    try {
        sections = parseEmailConditionalSectionsJson(
            formData.get("sectionsJson")
        );
    } catch (err) {
        return {
            error: {
                _form: [
                    err instanceof Error
                        ? err.message
                        : "Neplatné podmíněné sekce",
                ],
            },
        };
    }

    let attachments;
    try {
        attachments = parseEmailAttachmentsJson(
            formData.get("attachmentsJson")
        );
    } catch (err) {
        return {
            error: {
                _form: [
                    err instanceof Error ? err.message : "Neplatné přílohy",
                ],
            },
        };
    }

    try {
        await db.$transaction(async (tx) => {
            await tx.year.update({
                where: { id: yearId },
                data: {
                    confirmationEmailSubject:
                        validated.data.confirmationEmailSubject,
                    confirmationEmailBody: validated.data.confirmationEmailBody,
                    confirmationEmailBcc: validated.data.confirmationEmailBcc,
                    confirmationEmailAccountId: validated.data.emailAccountId,
                    confirmationEmailSections: sections,
                    confirmationEmailAttachments: attachments,
                },
            });
            await syncYearEmailToV2(tx, yearId, "confirmation", {
                subject: validated.data.confirmationEmailSubject,
                body: validated.data.confirmationEmailBody,
                bcc: validated.data.confirmationEmailBcc,
                accountId: validated.data.emailAccountId,
                sections,
                attachments,
            });
        });

        revalidatePath(`/admin/rocniky/${yearId}/emaily`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update email template:", error);
        return { error: "Nepodařilo se uložit šablonu emailu" };
    }
}

export async function updateRegistrationSuccessContent(
    yearId: string,
    formData: FormData
) {
    try {
        await requireEditor();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    const raw = (formData.get("content") as string | null) ?? "[]";

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { error: "Neplatný formát obsahu" };
    }

    const validated = contentBlocksSchema.safeParse(parsed);
    if (!validated.success) {
        return { error: "Neplatný formát obsahu" };
    }

    try {
        await db.year.update({
            where: { id: yearId },
            data: { registrationSuccessContent: validated.data },
        });

        revalidatePath(`/admin/rocniky/${yearId}/registrace`);
        revalidatePath(`/admin/rocniky/${yearId}/registrace/success-page`);
        revalidatePath(`/registrace`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update registration success content:", error);
        return { error: "Nepodařilo se uložit obsah" };
    }
}

export async function toggleConfirmationEmail(
    yearId: string,
    enabled: boolean
) {
    try {
        await requireEditor();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        if (enabled) {
            const year = await db.year.findUnique({
                where: { id: yearId },
                select: {
                    confirmationEmailSubject: true,
                    confirmationEmailBody: true,
                },
            });

            if (
                !year?.confirmationEmailSubject ||
                !year?.confirmationEmailBody
            ) {
                return { error: "Nejdříve nastavte předmět a text emailu" };
            }
        }

        await db.$transaction(async (tx) => {
            await tx.year.update({
                where: { id: yearId },
                data: { confirmationEmailEnabled: enabled },
            });
            await toggleYearEmailInV2(tx, yearId, "confirmation", enabled);
        });

        revalidatePath(`/admin/rocniky/${yearId}/emaily`);
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle confirmation email:", error);
        return { error: "Nepodařilo se změnit stav potvrzovacího emailu" };
    }
}

export async function updatePriceChangeEmailTemplate(
    yearId: string,
    formData: FormData
) {
    try {
        await requireEditor();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    const rawData = {
        confirmationEmailSubject:
            formData.get("confirmationEmailSubject") || "",
        confirmationEmailBody: formData.get("confirmationEmailBody") || "",
        confirmationEmailBcc: formData.get("confirmationEmailBcc") || null,
        emailAccountId: formData.get("emailAccountId") || null,
    };

    const validated = updateEmailTemplateSchema.safeParse(rawData);
    if (!validated.success) {
        return { error: validated.error.flatten().fieldErrors };
    }

    let sections;
    try {
        sections = parseEmailConditionalSectionsJson(
            formData.get("sectionsJson")
        );
    } catch (err) {
        return {
            error: {
                _form: [
                    err instanceof Error
                        ? err.message
                        : "Neplatné podmíněné sekce",
                ],
            },
        };
    }

    let attachments;
    try {
        attachments = parseEmailAttachmentsJson(
            formData.get("attachmentsJson")
        );
    } catch (err) {
        return {
            error: {
                _form: [
                    err instanceof Error ? err.message : "Neplatné přílohy",
                ],
            },
        };
    }

    try {
        await db.$transaction(async (tx) => {
            await tx.year.update({
                where: { id: yearId },
                data: {
                    priceChangeEmailSubject:
                        validated.data.confirmationEmailSubject,
                    priceChangeEmailBody: validated.data.confirmationEmailBody,
                    priceChangeEmailBcc: validated.data.confirmationEmailBcc,
                    priceChangeEmailAccountId: validated.data.emailAccountId,
                    priceChangeEmailSections: sections,
                    priceChangeEmailAttachments: attachments,
                },
            });
            await syncYearEmailToV2(tx, yearId, "price_change", {
                subject: validated.data.confirmationEmailSubject,
                body: validated.data.confirmationEmailBody,
                bcc: validated.data.confirmationEmailBcc,
                accountId: validated.data.emailAccountId,
                sections,
                attachments,
            });
        });

        revalidatePath(`/admin/rocniky/${yearId}/emaily`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update price change email template:", error);
        return { error: "Nepodařilo se uložit šablonu emailu" };
    }
}

export async function togglePriceChangeEmail(yearId: string, enabled: boolean) {
    try {
        await requireEditor();
    } catch {
        return { error: "Nemáte oprávnění" };
    }

    try {
        if (enabled) {
            const year = await db.year.findUnique({
                where: { id: yearId },
                select: {
                    priceChangeEmailSubject: true,
                    priceChangeEmailBody: true,
                },
            });

            if (!year?.priceChangeEmailSubject || !year?.priceChangeEmailBody) {
                return { error: "Nejdříve nastavte předmět a text emailu" };
            }
        }

        await db.$transaction(async (tx) => {
            await tx.year.update({
                where: { id: yearId },
                data: { priceChangeEmailEnabled: enabled },
            });
            await toggleYearEmailInV2(tx, yearId, "price_change", enabled);
        });

        revalidatePath(`/admin/rocniky/${yearId}/emaily`);
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle price change email:", error);
        return { error: "Nepodařilo se změnit stav emailu při změně ceny" };
    }
}

async function createDefaultPages(
    yearId: string,
    client: PrismaClient | Prisma.TransactionClient = db
) {
    const defaultPages = [
        { slug: "uvod", title: "Úvod", sortOrder: 0 },
        { slug: "program", title: "Program", sortOrder: 1 },
        { slug: "registrace", title: "Registrace", sortOrder: 2 },
        { slug: "pravidla", title: "Pravidla", sortOrder: 3 },
        { slug: "co-nabizime", title: "Co nabízíme", sortOrder: 4 },
        { slug: "galerie", title: "Galerie", sortOrder: 5 },
        { slug: "na-pamatku", title: "Na památku", sortOrder: 6 },
    ];

    await client.page.createMany({
        data: defaultPages.map((page) => ({
            ...page,
            yearId,
            content: { sections: [] },
            isPublished: false,
        })),
    });
}
