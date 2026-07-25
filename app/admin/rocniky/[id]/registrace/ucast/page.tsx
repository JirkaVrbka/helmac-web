import { Container } from "@mui/material";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { AttendanceStats } from "@/components/admin/attendance-stats";
import { getYearById } from "@/lib/services/years";
import { db } from "@/lib/db";
import {
    getFormStructure,
    getOptionCounts,
    v2FieldToInputField,
    v2PricingDefsToPricingDefs,
} from "@/lib/services/v2";
import type { V2OptionCountsResult } from "@/lib/services/v2";

interface UcastPageProps {
    params: Promise<{ id: string }>;
}

const OPTION_FIELD_TYPES = new Set([
    "select",
    "radio",
    "pricing_select",
    "pricing_multi_select",
    "pricing_quantity",
]);

export default async function UcastPage({ params }: UcastPageProps) {
    await requireAdmin();
    const { id } = await params;

    const year = await getYearById(id);
    if (!year) {
        notFound();
    }

    const [formStructure, peopleCounts] = await Promise.all([
        getFormStructure(year.id),
        db.v2OrderPerson.groupBy({
            by: ["isAttending"],
            where: {
                order: {
                    yearId: year.id,
                    isTest: false,
                    status: {
                        notIn: ["CANCELLED", "REJECTED"],
                    },
                },
            },
            _count: true,
        }),
    ]);

    const totalPeople = peopleCounts.reduce(
        (sum, g) => sum + g._count,
        0,
    );
    const attendingPeople =
        peopleCounts.find((g) => g.isAttending)?._count ?? 0;

    const optionFields = formStructure
        ? formStructure.fields.filter((f) =>
              OPTION_FIELD_TYPES.has(f.type),
          )
        : [];

    let totalCounts: V2OptionCountsResult = {};
    let attendingCounts: V2OptionCountsResult = {};

    if (optionFields.length > 0) {
        const fieldNames = optionFields.map((f) => f.name);
        [totalCounts, attendingCounts] = await Promise.all([
            getOptionCounts(
                year.id,
                fieldNames,
                null,
                null,
                null,
            ),
            getOptionCounts(
                year.id,
                fieldNames,
                null,
                null,
                true,
            ),
        ]);
    }

    const inputFields = optionFields.map(v2FieldToInputField);
    const pricingDefinitions = formStructure
        ? v2PricingDefsToPricingDefs(
              formStructure.pricingDefinitions,
          )
        : [];

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
                    {
                        label: "Registrace",
                        href: `/admin/rocniky/${year.id}/registrace`,
                    },
                    { label: "Účast" },
                ]}
                title="Statistiky účasti"
            />

            <AttendanceStats
                totalPeople={totalPeople}
                attendingPeople={attendingPeople}
                totalCounts={totalCounts}
                attendingCounts={attendingCounts}
                fields={inputFields}
                pricingDefinitions={pricingDefinitions}
            />
        </Container>
    );
}
