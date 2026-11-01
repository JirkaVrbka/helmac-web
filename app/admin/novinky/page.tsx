import { Container, Typography, Box } from "@mui/material";
import { LinkButton } from "@/components/ui/link-button";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { ListFilters } from "@/components/admin/list-filters";
import { NewsList } from "@/components/admin/news-list";
import { DashedAddButton } from "@/components/admin/dashed-add-button";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { Prisma } from "@prisma/client";

interface NewsListPageProps {
    searchParams: Promise<{ q?: string; yearId?: string }>;
}

async function getNews(filters: { q?: string; yearId?: string }) {
    const where: Prisma.NewsWhereInput = {};

    if (filters.q) {
        where.OR = [
            { title: { contains: filters.q, mode: "insensitive" } },
            { content: { contains: filters.q, mode: "insensitive" } },
        ];
    }

    if (filters.yearId) {
        where.yearId = filters.yearId;
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

async function getYears() {
    return db.year.findMany({
        where: { isArchived: false },
        orderBy: { year: "desc" },
        select: { id: true, year: true, title: true },
    });
}

export default async function NewsListPage({
    searchParams,
}: NewsListPageProps) {
    const params = await searchParams;
    const [news, years] = await Promise.all([getNews(params), getYears()]);

    return (
        <Container maxWidth="lg">
            <PageHeader breadcrumbs={[{ label: "Novinky" }]} title="Novinky" />
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    mb: 4,
                }}
            >
                {years.length > 0 && (
                    <DashedAddButton href="/admin/novinky/nova">
                        Nová novinka
                    </DashedAddButton>
                )}
            </Box>

            {years.length > 0 && (
                <ListFilters
                    showYearFilter
                    years={years}
                    searchPlaceholder="Hledat novinky..."
                />
            )}

            {years.length === 0 ? (
                <Box
                    sx={{
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        p: 5,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ color: p.ink3 }}>
                        Nejprve vytvořte ročník pro přidávání novinek.
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            mt: 2,
                        }}
                    >
                        <LinkButton
                            href="/admin/rocniky/novy"
                            variant="outlined"
                            sx={{
                                borderRadius: "10px",
                                color: p.ink2,
                                borderColor: p.line,
                                "&:hover": {
                                    borderColor: p.ink3,
                                    backgroundColor: p.surface2,
                                },
                            }}
                        >
                            Vytvořit ročník
                        </LinkButton>
                    </Box>
                </Box>
            ) : news.length === 0 ? (
                <Box
                    sx={{
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        p: 5,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ color: p.ink3 }}>
                        {params.q || params.yearId
                            ? "Žádné novinky neodpovídají filtru."
                            : "Zatím nebyly vytvořeny žádné novinky."}
                    </Typography>
                </Box>
            ) : (
                <NewsList news={news} />
            )}
        </Container>
    );
}
