import { Container, Typography, Box } from "@mui/material";
import { Archive, Star, Edit } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import { db } from "@/lib/db";
import { YearActions } from "@/components/admin/year-actions";
import { PageHeader } from "@/components/admin/page-header";
import { DashedAddButton } from "@/components/admin/dashed-add-button";
import { formatDate } from "@/lib/utils/date";
import { ListFilters } from "@/components/admin/list-filters";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { Prisma } from "@prisma/client";

interface YearsPageProps {
    searchParams: Promise<{ q?: string }>;
}

async function getYears(filters: { q?: string }) {
    const where: Prisma.YearWhereInput = {};

    if (filters.q) {
        const numericQuery = parseInt(filters.q, 10);
        where.OR = [
            { title: { contains: filters.q, mode: "insensitive" } },
            { subtitle: { contains: filters.q, mode: "insensitive" } },
            ...(isNaN(numericQuery) ? [] : [{ year: numericQuery }]),
        ];
    }

    return db.year.findMany({
        where,
        orderBy: { year: "desc" },
        include: {
            _count: {
                select: {
                    pages: true,
                    news: true,
                    albums: true,
                },
            },
        },
    });
}

export default async function YearsPage({ searchParams }: YearsPageProps) {
    const params = await searchParams;
    const years = await getYears(params);

    return (
        <Container maxWidth="lg">
            <PageHeader breadcrumbs={[{ label: "Ročníky" }]} title="Ročníky" />
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    mb: 4,
                }}
            >
                <DashedAddButton href="/admin/rocniky/novy">
                    Nový ročník
                </DashedAddButton>
            </Box>

            <ListFilters searchPlaceholder="Hledat ročníky..." />

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
                        {params.q
                            ? "Žádné ročníky neodpovídají hledání."
                            : "Zatím nebyly vytvořeny žádné ročníky."}
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: 2.25,
                    }}
                >
                    {years.map((year) => (
                        <Box
                            key={year.id}
                            sx={{
                                position: "relative",
                                backgroundColor: p.surface,
                                border: year.isActive
                                    ? `2px solid ${p.indigo}`
                                    : `1px solid ${p.line}`,
                                borderRadius: "14px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                transition:
                                    "box-shadow 160ms ease, transform 160ms ease",
                                "&:hover": {
                                    boxShadow: "0 10px 28px rgba(15,23,42,0.1)",
                                    transform: "translateY(-2px)",
                                },
                            }}
                        >
                            {/* body */}
                            <Box sx={{ p: 2.5, flex: 1 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: 1,
                                        mb: 1.5,
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "1.5rem",
                                                fontWeight: 700,
                                                lineHeight: 1.1,
                                                color: p.ink,
                                            }}
                                        >
                                            {year.year}
                                        </Typography>
                                        <Typography sx={{ color: p.ink2 }}>
                                            {year.title}
                                        </Typography>
                                        {year.subtitle && (
                                            <Typography
                                                sx={{
                                                    fontSize: "0.85rem",
                                                    color: p.ink3,
                                                }}
                                            >
                                                {year.subtitle}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 0.75,
                                            flexWrap: "wrap",
                                            justifyContent: "flex-end",
                                        }}
                                    >
                                        {year.isActive && (
                                            <Box
                                                sx={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    fontSize: "0.72rem",
                                                    fontWeight: 700,
                                                    px: "10px",
                                                    py: "3px",
                                                    borderRadius: "20px",
                                                    backgroundColor:
                                                        p.indigoSoft,
                                                    color: p.indigoInk,
                                                }}
                                            >
                                                <Star sx={{ fontSize: 13 }} />
                                                Aktivní
                                            </Box>
                                        )}
                                        {year.isArchived && (
                                            <Box
                                                sx={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    fontSize: "0.72rem",
                                                    fontWeight: 700,
                                                    px: "10px",
                                                    py: "3px",
                                                    borderRadius: "20px",
                                                    backgroundColor: p.surface3,
                                                    color: p.ink2,
                                                }}
                                            >
                                                <Archive
                                                    sx={{ fontSize: 13 }}
                                                />
                                                Archiv
                                            </Box>
                                        )}
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 2,
                                        mb: 1,
                                        fontSize: "0.85rem",
                                        color: p.ink3,
                                    }}
                                >
                                    <span>{year._count.pages} stránek</span>
                                    <span>{year._count.news} novinek</span>
                                    <span>{year._count.albums} alb</span>
                                </Box>

                                {(year.startDate || year.endDate) && (
                                    <Typography
                                        sx={{
                                            fontSize: "0.85rem",
                                            color: p.ink3,
                                        }}
                                    >
                                        {year.startDate &&
                                            formatDate(year.startDate)}
                                        {year.startDate &&
                                            year.endDate &&
                                            " - "}
                                        {year.endDate &&
                                            formatDate(year.endDate)}
                                    </Typography>
                                )}
                            </Box>

                            {/* foot */}
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    px: 2,
                                    py: 1.25,
                                    borderTop: `1px solid ${p.line}`,
                                    backgroundColor: p.surface2,
                                }}
                            >
                                <LinkButton
                                    href={`/admin/rocniky/${year.id}`}
                                    size="small"
                                    startIcon={<Edit />}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: "10px",
                                        color: p.indigo,
                                        "&:hover": {
                                            backgroundColor: p.indigoSoft,
                                        },
                                    }}
                                >
                                    Upravit
                                </LinkButton>
                                <YearActions
                                    yearId={year.id}
                                    isActive={year.isActive}
                                    isArchived={year.isArchived}
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Container>
    );
}
