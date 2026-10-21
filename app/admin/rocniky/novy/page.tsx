import { Container } from "@mui/material";
import { db } from "@/lib/db";
import { YearNewForm } from "@/components/forms/year-new-form";
import { PageHeader } from "@/components/admin/page-header";

async function getYears() {
    return db.year.findMany({
        orderBy: { year: "desc" },
        select: { id: true, year: true, title: true },
    });
}

export default async function NewYearPage() {
    const years = await getYears();

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[
                    { label: "Rocniky", href: "/admin/rocniky" },
                    { label: "Novy rocnik" },
                ]}
                title="Novy rocnik"
            />

            <YearNewForm years={years} />
        </Container>
    );
}
