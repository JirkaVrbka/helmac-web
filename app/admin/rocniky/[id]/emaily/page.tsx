import { Container, Box, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { MarkEmailRead, Payment, PriceChange, Send } from "@mui/icons-material";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { EmailToggle } from "./email-toggle";
import { togglePriceChangeEmail } from "@/lib/actions/years";
import { togglePaymentEmail } from "@/lib/actions/bank-sync";
import { ConditionalEmailCard } from "./conditional-email-card";
import { CreateConditionalEmailDialog } from "./create-conditional-email-dialog";
import {
    getFormStructure,
    v2PricingDefsToPricingDefs,
    v2FieldToInputField,
} from "@/lib/services/v2";
import { getFieldOptionValues } from "@/lib/utils/pricing";

interface EmailyPageProps {
    params: Promise<{ id: string }>;
}

const OPTION_FIELD_TYPES = new Set([
    "select",
    "radio",
    "checkbox",
    "pricing_select",
    "pricing_multi_select",
    "pricing_quantity",
]);

async function getYearEmailStatus(yearId: string) {
    return db.year.findUnique({
        where: { id: yearId },
        select: {
            id: true,
            year: true,
            title: true,
            confirmationEmailEnabled: true,
            confirmationEmailSubject: true,
            confirmationEmailBody: true,
            confirmationEmailAccountId: true,
            confirmationEmailAccount: {
                select: { email: true, label: true },
            },
            priceChangeEmailEnabled: true,
            priceChangeEmailSubject: true,
            priceChangeEmailBody: true,
            priceChangeEmailAccountId: true,
            priceChangeEmailAccount: {
                select: { email: true, label: true },
            },
            paymentEmailEnabled: true,
            paymentEmailSubject: true,
            paymentEmailBody: true,
            paymentEmailAccountId: true,
            paymentEmailAccount: {
                select: { email: true, label: true },
            },
            conditionalEmails: {
                select: {
                    id: true,
                    name: true,
                    enabled: true,
                    conditionFieldName: true,
                    conditionOperator: true,
                    conditionValue: true,
                    subject: true,
                    body: true,
                    account: {
                        select: { email: true, label: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });
}

const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
    mb: 2.25,
};

const paneHeadSx = {
    px: 2.5,
    py: 1.75,
    borderBottom: `1px solid ${p.line}`,
    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
};

const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: p.ink3,
    fontWeight: 700,
    flex: 1,
};

const ghostBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    border: `1px solid ${p.line}`,
    color: p.ink2,
    backgroundColor: p.surface,
    boxShadow: "none",
    "&:hover": {
        borderColor: p.ink3,
        backgroundColor: p.surface2,
        boxShadow: "none",
    },
};

function SenderInfo({
    account,
}: {
    account: { email: string; label: string | null } | null;
}) {
    if (account) {
        return (
            <Typography variant="body2" sx={{ color: p.ink3, mt: 1 }}>
                Odesílatel: {account.email}
                {account.label ? ` (${account.label})` : ""}
            </Typography>
        );
    }
    return (
        <Typography variant="body2" sx={{ color: p.ink3, mt: 1 }}>
            Odesílatel: Hlavní emailový účet
        </Typography>
    );
}

export default async function EmailyPage({ params }: EmailyPageProps) {
    const { id } = await params;
    const year = await getYearEmailStatus(id);

    if (!year) {
        notFound();
    }

    const hasConfirmationTemplate =
        !!year.confirmationEmailSubject && !!year.confirmationEmailBody;
    const hasPriceChangeTemplate =
        !!year.priceChangeEmailSubject && !!year.priceChangeEmailBody;
    const hasPaymentTemplate =
        !!year.paymentEmailSubject && !!year.paymentEmailBody;

    const formStructure = await getFormStructure(year.id);
    const pricingDefinitions = formStructure
        ? v2PricingDefsToPricingDefs(formStructure.pricingDefinitions)
        : [];
    const allInputFields = (formStructure?.fields ?? []).map(
        v2FieldToInputField
    );
    const fieldNameToLabel = new Map(
        allInputFields.map((f) => [f.name, f.label])
    );
    const availableFields = allInputFields
        .filter((f) => {
            if (!OPTION_FIELD_TYPES.has(f.type)) return false;
            if (f.type === "checkbox") return true;
            return getFieldOptionValues(f, pricingDefinitions).length > 0;
        })
        .map((f) => ({
            id: f.id,
            name: f.name,
            label: f.label,
            type: f.type,
            options: getFieldOptionValues(f, pricingDefinitions),
        }));

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[
                    { label: "Ročníky", href: "/admin/rocniky" },
                    {
                        label: `${year.year}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    { label: "Emaily" },
                ]}
                title="Emaily"
            />

            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>Potvrzovací email</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <EmailToggle
                        yearId={year.id}
                        initialEnabled={year.confirmationEmailEnabled}
                        hasTemplate={hasConfirmationTemplate}
                    />

                    {!hasConfirmationTemplate && (
                        <Typography
                            variant="body2"
                            sx={{ color: p.ink3, mt: 1, mb: 2 }}
                        >
                            Šablona emailu zatím není nastavena.
                        </Typography>
                    )}

                    {hasConfirmationTemplate && (
                        <SenderInfo account={year.confirmationEmailAccount} />
                    )}

                    <Box sx={{ mt: 2 }}>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/emaily/potvrzovaci`}
                            variant="outlined"
                            startIcon={<MarkEmailRead />}
                            sx={ghostBtnSx}
                        >
                            {hasConfirmationTemplate
                                ? "Zobrazit šablonu"
                                : "Nastavit šablonu"}
                        </LinkButton>
                    </Box>
                </Box>
            </Box>

            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>Email při změně ceny</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <EmailToggle
                        yearId={year.id}
                        initialEnabled={year.priceChangeEmailEnabled}
                        hasTemplate={hasPriceChangeTemplate}
                        toggleAction={togglePriceChangeEmail}
                        label="Odesílat email při změně ceny registrace"
                    />

                    {!hasPriceChangeTemplate && (
                        <Typography
                            variant="body2"
                            sx={{ color: p.ink3, mt: 1, mb: 2 }}
                        >
                            Šablona emailu zatím není nastavena.
                        </Typography>
                    )}

                    {hasPriceChangeTemplate && (
                        <SenderInfo account={year.priceChangeEmailAccount} />
                    )}

                    <Box sx={{ mt: 2 }}>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/emaily/zmena-ceny`}
                            variant="outlined"
                            startIcon={<PriceChange />}
                            sx={ghostBtnSx}
                        >
                            {hasPriceChangeTemplate
                                ? "Zobrazit šablonu"
                                : "Nastavit šablonu"}
                        </LinkButton>
                    </Box>
                </Box>
            </Box>

            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>
                        Email při přijetí platby
                    </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <EmailToggle
                        yearId={year.id}
                        initialEnabled={year.paymentEmailEnabled}
                        hasTemplate={hasPaymentTemplate}
                        toggleAction={togglePaymentEmail}
                        label="Odesílat email po přijetí platby"
                    />

                    {!hasPaymentTemplate && (
                        <Typography
                            variant="body2"
                            sx={{ color: p.ink3, mt: 1, mb: 2 }}
                        >
                            Šablona emailu zatím není nastavena.
                        </Typography>
                    )}

                    {hasPaymentTemplate && (
                        <SenderInfo account={year.paymentEmailAccount} />
                    )}

                    <Box sx={{ mt: 2 }}>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/emaily/platba`}
                            variant="outlined"
                            startIcon={<Payment />}
                            sx={ghostBtnSx}
                        >
                            {hasPaymentTemplate
                                ? "Zobrazit šablonu"
                                : "Nastavit šablonu"}
                        </LinkButton>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ ...paneSx, mb: 3.5 }}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>Hromadné emaily</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <Typography variant="body2" sx={{ color: p.ink3, mb: 2 }}>
                        Jednorázové hromadné emaily odeslané vybraným
                        registrovaným účastníkům.
                    </Typography>

                    <LinkButton
                        href={`/admin/rocniky/${year.id}/emaily/hromadne`}
                        variant="outlined"
                        startIcon={<Send />}
                        sx={ghostBtnSx}
                    >
                        Spravovat hromadné emaily
                    </LinkButton>
                </Box>
            </Box>

            {year.conditionalEmails.length > 0 && (
                <>
                    <Box
                        sx={{
                            height: "1px",
                            backgroundColor: p.lineSoft,
                            my: 3,
                        }}
                    />
                    <Typography
                        sx={{
                            fontSize: 11,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: p.ink3,
                            fontWeight: 700,
                            mb: 2,
                        }}
                    >
                        Podmíněné emaily
                    </Typography>
                    {year.conditionalEmails.map((email) => (
                        <ConditionalEmailCard
                            key={email.id}
                            yearId={year.id}
                            email={{
                                ...email,
                                conditionFieldLabel:
                                    fieldNameToLabel.get(
                                        email.conditionFieldName
                                    ) ?? email.conditionFieldName,
                            }}
                        />
                    ))}
                </>
            )}

            <CreateConditionalEmailDialog
                yearId={year.id}
                availableFields={availableFields}
            />
        </Container>
    );
}
