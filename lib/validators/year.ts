import { z } from "zod";

export const createYearSchema = z.object({
    year: z.coerce
        .number()
        .min(2000, "Rok musi byt vetsi nez 2000")
        .max(2100, "Rok musi byt mensi nez 2100"),
    title: z
        .string()
        .min(1, "Nazev je povinny")
        .max(200, "Nazev je prilis dlouhy"),
    subtitle: z.string().max(500, "Podtitulek je prilis dlouhy").optional(),
    startDate: z.coerce.date({ message: "Datum zacatku je povinne" }),
    endDate: z.coerce.date({ message: "Datum konce je povinne" }),
    headerPhoto: z.string().max(500).optional().nullable(),
    heroPhoto: z.string().max(500).optional().nullable(),
});

export const updateYearSchema = createYearSchema.partial();

export type CreateYearInput = z.infer<typeof createYearSchema>;
export type UpdateYearInput = z.infer<typeof updateYearSchema>;

// ============================================================
// Create year with content reuse
// ============================================================

const yearCopySelectionSchema = z.object({
    sectionIds: z.array(z.string()),
    homepageStepIds: z.array(z.string()),
    newsIds: z.array(z.string()),
    programDayIds: z.array(z.string()),
    v2EmailTemplateIds: z.array(z.string()),
    copyRegistrationForm: z.boolean(),
    copyLimits: z.boolean(),
    copySuccessContent: z.boolean(),
});

export const createYearWithReuseSchema = z.object({
    year: z.coerce
        .number()
        .min(2000, "Rok musi byt vetsi nez 2000")
        .max(2100, "Rok musi byt mensi nez 2100"),
    title: z
        .string()
        .min(1, "Nazev je povinny")
        .max(200, "Nazev je prilis dlouhy"),
    subtitle: z.string().max(500, "Podtitulek je prilis dlouhy").optional(),
    startDate: z.coerce.date({ message: "Datum zacatku je povinne" }),
    endDate: z.coerce.date({ message: "Datum konce je povinne" }),
    // Source event start, used only as a fallback when the source year has
    // no startDate of its own.
    anchorStartDate: z.coerce.date().optional().nullable(),
    sourceYearId: z.string().min(1, "Zdrojovy rocnik je povinny"),
    headerPhoto: z.string().max(500).optional().nullable(),
    heroPhoto: z.string().max(500).optional().nullable(),
    selection: yearCopySelectionSchema,
});

export type CreateYearWithReuseInput = z.infer<
    typeof createYearWithReuseSchema
>;

export const updateEmailTemplateSchema = z.object({
    confirmationEmailSubject: z
        .string()
        .min(1, "Předmět je povinný")
        .max(200, "Předmět je příliš dlouhý"),
    confirmationEmailBody: z
        .string()
        .min(1, "Text emailu je povinný")
        .max(50000, "Text emailu je příliš dlouhý"),
    confirmationEmailBcc: z
        .string()
        .email("Neplatný email pro BCC")
        .optional()
        .nullable()
        .transform((v) => v || null),
    emailAccountId: z
        .string()
        .cuid()
        .optional()
        .nullable()
        .transform((v) => v || null),
});
