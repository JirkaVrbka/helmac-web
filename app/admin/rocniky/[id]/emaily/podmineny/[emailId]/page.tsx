import { Container, Typography, Box } from "@mui/material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import {
    getFormStructure,
    v2FieldsToFormFields,
    v2PricingDefsToPricingDefs,
} from "@/lib/services/v2";
import type { EmailConditionalSection } from "@/lib/types/email-sections";
import type { EmailAttachment } from "@/lib/validators/email-attachment";
import { updateConditionalEmailTemplate } from "@/lib/actions/conditional-emails";

const monoPillSx = {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    px: "7px",
    py: "2px",
    mx: 0.5,
    borderRadius: "6px",
    backgroundColor: p.surface3,
    color: p.ink2,
    verticalAlign: "middle",
};

interface ConditionalEmailPageProps {
    params: Promise<{ id: string; emailId: string }>;
}

export default async function ConditionalEmailPage({
    params,
}: ConditionalEmailPageProps) {
    const { id, emailId } = await params;

    const [conditionalEmail, emailAccounts] = await Promise.all([
        db.conditionalEmail.findUnique({
            where: { id: emailId },
            select: {
                id: true,
                yearId: true,
                name: true,
                conditionFieldName: true,
                conditionOperator: true,
                conditionValue: true,
                subject: true,
                body: true,
                bcc: true,
                accountId: true,
                sections: true,
                attachments: true,
            },
        }),
        db.emailAccount.findMany({
            select: { id: true, email: true, label: true, isMain: true },
            orderBy: [{ isMain: "desc" }, { email: "asc" }],
        }),
    ]);

    if (!conditionalEmail || conditionalEmail.yearId !== id) {
        notFound();
    }

    // Fetch year for breadcrumbs
    const year = await db.year.findUnique({
        where: { id },
        select: { id: true, year: true },
    });

    if (!year) {
        notFound();
    }

    const formStructure = await getFormStructure(year.id);
    const allFormFields = formStructure
        ? v2FieldsToFormFields(formStructure.fields)
        : [];
    const pricingDefinitions = formStructure
        ? v2PricingDefsToPricingDefs(formStructure.pricingDefinitions)
        : [];

    const fieldNameToLabel = new Map(
        (formStructure?.fields ?? []).map((f) => [f.name, f.label])
    );
    const conditionFieldLabel =
        fieldNameToLabel.get(conditionalEmail.conditionFieldName) ??
        conditionalEmail.conditionFieldName;

    const availablePlaceholders = [
        ...(formStructure?.fields ?? []).map((f) => ({
            key: f.name,
            label: f.label,
        })),
        { key: "variabilniSymbol", label: "Variabilní symbol" },
        { key: "celkovaCena", label: "Celková cena" },
        { key: "cisloUctu", label: "Číslo účtu" },
        { key: "iban", label: "IBAN" },
        { key: "swift", label: "SWIFT" },
        { key: "rok", label: "Rok" },
        { key: "nazevRocniku", label: "Název ročníku" },
        { key: "podtitulek", label: "Podtitulek" },
        { key: "qrPlatba", label: "QR platba" },
    ];

    return (
        <Container maxWidth="xl">
            <PageHeader
                breadcrumbs={[
                    { label: "Ročníky", href: "/admin/rocniky" },
                    {
                        label: `${year.year}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    {
                        label: "Emaily",
                        href: `/admin/rocniky/${year.id}/emaily`,
                    },
                    { label: conditionalEmail.name },
                ]}
                title={conditionalEmail.name}
            />

            <Box sx={{ mb: 2 }}>
                <Typography
                    variant="body2"
                    component="div"
                    sx={{ color: p.ink3 }}
                >
                    Podmínka: pole{" "}
                    <Box component="span" sx={monoPillSx}>
                        {conditionFieldLabel}
                    </Box>
                    {conditionalEmail.conditionOperator === "is_set" &&
                        " – cokoli vybráno"}
                    {conditionalEmail.conditionOperator === "is_not_set" &&
                        " – nic nevybráno"}
                    {conditionalEmail.conditionOperator === "equals" && (
                        <>
                            {" = "}
                            <Box component="span" sx={monoPillSx}>
                                {conditionalEmail.conditionValue ?? ""}
                            </Box>
                        </>
                    )}
                    {conditionalEmail.conditionOperator ===
                        "quantity_gt_zero" && (
                        <>
                            {" – počet pro "}
                            <Box component="span" sx={monoPillSx}>
                                {conditionalEmail.conditionValue ?? ""}
                            </Box>
                            {" > 0"}
                        </>
                    )}
                    {conditionalEmail.conditionOperator ===
                        "quantity_any_gt_zero" && " – jakákoli volba > 0"}
                </Typography>
            </Box>

            <EmailTemplateEditor
                yearId={conditionalEmail.id}
                confirmationEmailSubject={conditionalEmail.subject}
                confirmationEmailBody={conditionalEmail.body}
                confirmationEmailBcc={conditionalEmail.bcc}
                availablePlaceholders={availablePlaceholders}
                saveAction={updateConditionalEmailTemplate}
                emailAccounts={emailAccounts}
                selectedEmailAccountId={conditionalEmail.accountId}
                initialSections={
                    (conditionalEmail.sections as unknown as EmailConditionalSection[]) ??
                    []
                }
                initialAttachments={
                    (conditionalEmail.attachments as unknown as EmailAttachment[]) ??
                    []
                }
                availableFields={allFormFields}
                pricingDefinitions={pricingDefinitions}
            />
        </Container>
    );
}
