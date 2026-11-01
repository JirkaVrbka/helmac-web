import { Container, Typography, Box } from "@mui/material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageForm } from "@/components/forms/page-form";
import { PageHeader } from "@/components/admin/page-header";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface NewPageProps {
    params: Promise<{ id: string }>;
}

async function getYear(id: string) {
    return db.year.findUnique({
        where: { id },
        select: { id: true, year: true, title: true },
    });
}

export default async function NewPagePage({ params }: NewPageProps) {
    const { id } = await params;
    const year = await getYear(id);

    if (!year) {
        notFound();
    }

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[
                    { label: "Rocniky", href: "/admin/rocniky" },
                    {
                        label: `${year.year}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    { label: "Nova stranka" },
                ]}
                title="Nova stranka"
            />
            <Box sx={{ mb: 4 }}>
                <Typography sx={{ color: p.ink2 }}>
                    Rocnik {year.year} - {year.title}
                </Typography>
            </Box>

            <PageForm mode="create" yearId={year.id} />
        </Container>
    );
}
