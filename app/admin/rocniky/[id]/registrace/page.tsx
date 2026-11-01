import { Container, Box } from "@mui/material";
import { Description, People, CheckCircleOutline } from "@mui/icons-material";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { RegistrationSettings } from "@/components/admin/registration-settings";
import { CapacityLimitsEditor } from "@/components/admin/capacity-limits-editor";
import { OptionCountsEditor } from "@/components/admin/option-counts-editor";
import { LinkButton } from "@/components/ui/link-button";
import { getOptionCountsForYear } from "@/lib/services";
import { getYearRegistrationSettings } from "@/lib/services/years";
import {
    hasMainEmailAccount,
    hasConfiguredBankAccount,
} from "@/lib/services/bank-account";
import {
    getRegistrationSummary,
    getFormStructure,
    v2FieldToInputField,
    v2PricingDefsToPricingDefs,
} from "@/lib/services/v2";

interface RegistracePageProps {
    params: Promise<{ id: string }>;
}

const OPTION_FIELD_TYPES = new Set([
    "select",
    "radio",
    "pricing_select",
    "pricing_multi_select",
    "pricing_quantity",
]);

export default async function RegistracePage({ params }: RegistracePageProps) {
    await requireAdmin();
    const { id } = await params;

    const year = await getYearRegistrationSettings(id);

    if (!year) {
        notFound();
    }

    const [summary, formStructure] = await Promise.all([
        getRegistrationSummary(year.id),
        getFormStructure(year.id),
    ]);

    const allInputFields = formStructure
        ? formStructure.fields
              .filter((f) => OPTION_FIELD_TYPES.has(f.type))
              .map(v2FieldToInputField)
        : [];

    const optionCounts =
        formStructure && allInputFields.length > 0
            ? await getOptionCountsForYear(year.id)
            : undefined;

    const v2IdToLegacyId = new Map(
        (formStructure?.fields ?? [])
            .filter((f) => f.legacyId)
            .map((f) => [f.id, f.legacyId!])
    );
    const capacityLimits = (formStructure?.capacityLimits ?? []).map((cl) => ({
        ...cl,
        fieldId: v2IdToLegacyId.get(cl.fieldId) ?? cl.fieldId,
    }));
    const showOptionCounts = (() => {
        const layout = formStructure?.layout as
            | { showOptionCounts?: string[] }
            | null
            | undefined;
        return layout?.showOptionCounts ?? [];
    })();

    const [hasEmail, hasBank] = await Promise.all([
        hasMainEmailAccount(),
        hasConfiguredBankAccount(),
    ]);

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[
                    {
                        label: "Ročníky",
                        href: "/admin/rocniky",
                    },
                    {
                        label: `${year.year}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    { label: "Registrace" },
                ]}
                title="Registrace"
            />

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2.25,
                }}
            >
                <RegistrationSettings
                    yearId={year.id}
                    registrationOpen={year.registrationOpen}
                    registrationStartDate={year.registrationStartDate}
                    submissionCount={summary.registrations}
                    totalPeopleCount={summary.people}
                    paidSum={summary.paidTotal}
                    unpaidSum={summary.unpaidTotal}
                    hasMainEmail={hasEmail}
                    hasBankAccount={hasBank}
                />

                {formStructure && allInputFields.length > 0 && (
                    <>
                        <CapacityLimitsEditor
                            yearId={year.id}
                            capacityLimits={capacityLimits.map((cl) => ({
                                id: cl.id,
                                fieldId: cl.fieldId,
                                value: cl.optionValue ?? "",
                                maxCount: cl.maxCount,
                            }))}
                            allInputFields={allInputFields}
                            pricingDefinitions={v2PricingDefsToPricingDefs(
                                formStructure.pricingDefinitions
                            )}
                            optionCounts={optionCounts}
                        />
                        <OptionCountsEditor
                            yearId={year.id}
                            showOptionCounts={showOptionCounts}
                            allInputFields={allInputFields}
                            optionCounts={optionCounts}
                        />
                    </>
                )}

                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                    }}
                >
                    <LinkButton
                        href={`/admin/rocniky/${year.id}/registrace/formular`}
                        variant="outlined"
                        startIcon={<Description />}
                    >
                        Upravit formulář
                    </LinkButton>
                    <LinkButton
                        href={`/admin/rocniky/${year.id}/registrace/prihlasky`}
                        variant="outlined"
                        startIcon={<People />}
                    >
                        Zobrazit přihlášky
                    </LinkButton>
                    <LinkButton
                        href={`/admin/rocniky/${year.id}/registrace/success-page`}
                        variant="outlined"
                        startIcon={<CheckCircleOutline />}
                    >
                        Úspěšná registrace
                    </LinkButton>
                </Box>
            </Box>
        </Container>
    );
}
