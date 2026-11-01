import { Container, Typography, Box } from "@mui/material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { ListFilters } from "@/components/admin/list-filters";
import { NewsList } from "@/components/admin/news-list";
import { DashedAddButton } from "@/components/admin/dashed-add-button";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { Prisma } from "@prisma/client";

interface YearNewsPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string }>;
}

async function getYear(id: string) {
    return db.year.findUnique({
        where: { id },
        select: { id: true, year: true, title: true },
    });
}

async function getNews(yearId: string, filters: { q?: string }) {
    const where: Prisma.NewsWhereInput = { yearId };

    if (filters.q) {
        where.OR = [
            { title: { contains: filters.q, mode: "insensitive" } },
            { content: { contains: filters.q, mode: "insensitive" } },
        ];
    }

    return db.news.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            year: {
                select: { year: true, title: true },
            },
            author: {
                select: { name: true },
            },
        },
    });
}

export default async function YearNewsPage({
    params,
    searchParams,
}: YearNewsPageProps) {
    const { id } = await params;
    const search = await searchParams;
    const [year, news] = await Promise.all([getYear(id), getNews(id, search)]);

    if (!year) {
        notFound();
    }

    return (
        <Container maxWidth="lg">
            <PageHeader
                breadcrumbs={[
                    { label: "Ročníky", href: "/admin/rocniky" },
                    {
                        label: `${year.year} - ${year.title}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    { label: "Novinky" },
                ]}
                title="Novinky"
            />
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    mb: 4,
                }}
            >
                <DashedAddButton href={`/admin/rocniky/${id}/novinky/nova`}>
                    Nová novinka
                </DashedAddButton>
            </Box>

            <ListFilters searchPlaceholder="Hledat novinky..." />

            {news.length === 0 ? (
                <Box
                    sx={{
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        p: 5,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ color: p.ink3 }}>
                        {search.q
                            ? "Žádné novinky neodpovídají filtru."
                            : "Zatím nebyly vytvořeny žádné novinky pro tento ročník."}
                    </Typography>
                </Box>
            ) : (
                <NewsList
                    news={news}
                    editBasePath={`/admin/rocniky/${id}/novinky`}
                    showYear={false}
                />
            )}
        </Container>
    );
}
