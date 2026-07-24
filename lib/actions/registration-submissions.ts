"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import type { RegistrationStatus } from "@prisma/client";
import { sendConfirmationEmail, replacePlaceholders, buildPlaceholders, generateQRPaymentImage, appendConditionalSections, collectMatchingSectionAttachments } from "@/lib/utils/email";
import { formatCzechAccount, czechAccountToIBAN } from "@/lib/utils/spayd";
import { getAllInputFields, getAllFields } from "@/lib/types/registration-form";
import { migrateFormData } from "@/lib/utils/form-migration";
import { getGlobalBankAccount } from "@/lib/services/bank-account";
import { resolveSubmissionDataForDisplay } from "@/lib/utils/pricing-display";
import { syncOrderScalarToV2, syncOrderLineItemsToV2 } from "@/lib/utils/v2-dual-write";
import {
    getEmailTemplate,
    getFieldIdToLegacyIdMap,
    v2SectionsToLegacy,
} from "@/lib/services/v2";

interface ActionResult {
    success?: boolean;
    error?: string;
}

export async function updateSubmissionStatus(
    submissionId: string,
    status: RegistrationStatus
): Promise<ActionResult> {
    await requireAdmin();

    try {
        const submission = await db.$transaction(async (tx) => {
            const sub = await tx.registrationSubmission.update({
                where: { id: submissionId },
                data: { status },
                select: { yearId: true },
            });
            await syncOrderScalarToV2(tx, submissionId, { status });
            return sub;
        });

        revalidatePath(`/admin/rocniky/${submission.yearId}/registrace`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update submission status:", error);
        return { error: "Nepodařilo se změnit stav registrace" };
    }
}

export async function toggleSubmissionPayment(
    submissionId: string,
    isPaid: boolean
): Promise<ActionResult> {
    await requireAdmin();

    try {
        const paidAt = isPaid ? new Date() : null;
        const submission = await db.$transaction(async (tx) => {
            const sub = await tx.registrationSubmission.update({
                where: { id: submissionId },
                data: { isPaid, paidAt },
                select: { yearId: true },
            });
            await syncOrderScalarToV2(tx, submissionId, { isPaid, paidAt });
            return sub;
        });

        revalidatePath(`/admin/rocniky/${submission.yearId}/registrace`);
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle payment:", error);
        return { error: "Nepodařilo se změnit stav platby" };
    }
}

export async function updateSubmissionData(
    submissionId: string,
    data: Record<string, unknown>
): Promise<ActionResult> {
    await requireAdmin();

    try {
        const submission = await db.$transaction(async (tx) => {
            const sub = await tx.registrationSubmission.update({
                where: { id: submissionId },
                data: { data: data as Prisma.InputJsonValue },
                select: { yearId: true, formId: true },
            });
            await syncOrderLineItemsToV2(tx, submissionId, data, sub.formId);
            return sub;
        });

        revalidatePath(`/admin/rocniky/${submission.yearId}/registrace`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update submission data:", error);
        return { error: "Nepodařilo se aktualizovat data registrace" };
    }
}

export async function resendConfirmationEmail(submissionId: string): Promise<ActionResult> {
    await requireAdmin();

    try {
        const submission = await db.registrationSubmission.findUnique({
            where: { id: submissionId },
            select: {
                id: true,
                data: true,
                variableSymbol: true,
                totalPrice: true,
                yearId: true,
                form: { select: { fields: true } },
                year: {
                    select: {
                        year: true,
                        title: true,
                        subtitle: true,
                    },
                },
            },
        });

        if (!submission) {
            return { error: "Registrace nebyla nalezena" };
        }

        const template = await getEmailTemplate(submission.yearId, "confirmation");
        if (!template?.subject || !template?.body) {
            return { error: "Šablona emailu není nastavena" };
        }

        const formData = migrateFormData(submission.form.fields);
        const allInputFields = getAllInputFields(formData.fields);
        const allFields = getAllFields(formData.fields);
        const submissionData = submission.data as Record<string, unknown>;

        const emailField = allInputFields.find((f) => f.type === "email");
        const recipientEmail = emailField ? String(submissionData[emailField.name] ?? "") : "";

        if (!recipientEmail) {
            return { error: "Registrace neobsahuje emailovou adresu" };
        }

        const globalBank = await getGlobalBankAccount();
        const bankAccountStr = globalBank?.bankAccountNumber && globalBank?.bankAccountBankCode
            ? formatCzechAccount(
                globalBank.bankAccountNumber,
                globalBank.bankAccountBankCode,
                globalBank.bankAccountPrefix ?? undefined,
            )
            : null;
        const iban = globalBank?.bankAccountNumber && globalBank?.bankAccountBankCode
            ? czechAccountToIBAN(
                globalBank.bankAccountNumber,
                globalBank.bankAccountBankCode,
                globalBank.bankAccountPrefix ?? undefined,
            )
            : null;

        const displaySubmissionData = resolveSubmissionDataForDisplay(
            submissionData,
            allInputFields,
            formData.pricingDefinitions,
        );
        const placeholders = buildPlaceholders({
            submissionData: displaySubmissionData,
            variableSymbol: submission.variableSymbol,
            totalPrice: submission.totalPrice,
            bankAccount: bankAccountStr,
            iban,
            swift: globalBank?.bankSwift ?? null,
            yearNumber: submission.year.year,
            yearTitle: submission.year.title,
            yearSubtitle: submission.year.subtitle,
        });

        const fieldIdMap = await getFieldIdToLegacyIdMap(submission.yearId);
        const legacySections = v2SectionsToLegacy(template.sections, fieldIdMap);

        const subject = replacePlaceholders(template.subject, placeholders);
        const bodyWithSections = appendConditionalSections({
            body: template.body,
            sections: legacySections,
            rawSubmissionData: submissionData,
            allFields,
            pricingDefinitions: formData.pricingDefinitions,
        });
        const body = replacePlaceholders(bodyWithSections, placeholders);

        let qrImageBuffer: Buffer | null = null;
        if (
            submission.totalPrice &&
            submission.totalPrice > 0 &&
            submission.variableSymbol &&
            iban
        ) {
            qrImageBuffer = await generateQRPaymentImage({
                iban,
                amount: submission.totalPrice,
                variableSymbol: submission.variableSymbol,
            });
        }

        const sectionAttachments = collectMatchingSectionAttachments({
            sections: legacySections,
            rawSubmissionData: submissionData,
            allFields,
            pricingDefinitions: formData.pricingDefinitions,
        });

        const sent = await sendConfirmationEmail({
            to: recipientEmail,
            subject,
            body,
            bcc: template.bcc ?? undefined,
            qrImageBuffer: qrImageBuffer ?? undefined,
            accountId: template.accountId,
            attachments: [
                ...((template.attachments as { filename: string; url: string }[]) ?? []),
                ...sectionAttachments,
            ],
        });

        if (sent) {
            const emailSentAt = new Date();
            await db.$transaction(async (tx) => {
                await tx.registrationSubmission.update({
                    where: { id: submissionId },
                    data: { emailSent: true, emailSentAt },
                });
                await syncOrderScalarToV2(tx, submissionId, {
                    emailSent: true,
                    emailSentAt,
                });
            });

            revalidatePath(`/admin/rocniky/${submission.yearId}/registrace/${submissionId}`);
            return { success: true };
        } else {
            return { error: "Nepodařilo se odeslat email" };
        }
    } catch (error) {
        console.error("Failed to resend confirmation email:", error);
        return { error: "Nepodařilo se odeslat email" };
    }
}

export async function updateAdminNote(
    submissionId: string,
    adminNote: string
): Promise<ActionResult> {
    await requireAdmin();

    try {
        const note = adminNote || null;
        const submission = await db.$transaction(async (tx) => {
            const sub = await tx.registrationSubmission.update({
                where: { id: submissionId },
                data: { adminNote: note },
                select: { yearId: true },
            });
            await syncOrderScalarToV2(tx, submissionId, { adminNote: note });
            return sub;
        });

        revalidatePath(`/admin/rocniky/${submission.yearId}/registrace`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update admin note:", error);
        return { error: "Nepodařilo se uložit poznámku" };
    }
}

export async function deleteSubmission(submissionId: string): Promise<ActionResult> {
    await requireAdmin();

    try {
        const submission = await db.$transaction(async (tx) => {
            // Delete v2 order first (not FK-linked to old submission)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (tx as any).v2Order.deleteMany({
                where: { legacySubmissionId: submissionId },
            });
            return tx.registrationSubmission.delete({
                where: { id: submissionId },
                select: { yearId: true },
            });
        });

        revalidatePath(`/admin/rocniky/${submission.yearId}/registrace`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete submission:", error);
        return { error: "Nepodařilo se smazat registraci" };
    }
}

export async function togglePersonIsAttending(
    personId: string,
    isAttending: boolean,
): Promise<ActionResult> {
    await requireAdmin();

    try {
        const person = await db.v2OrderPerson.update({
            where: { id: personId },
            data: { isAttending },
            select: {
                order: { select: { yearId: true } },
            },
        });

        revalidatePath(
            `/admin/rocniky/${person.order.yearId}/registrace`,
        );
        return { success: true };
    } catch (error) {
        console.error(
            "Failed to toggle isAttending:",
            error,
        );
        return {
            error: "Nepodařilo se změnit účast",
        };
    }
}
