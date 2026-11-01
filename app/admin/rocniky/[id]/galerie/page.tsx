import { Container, Typography, Box } from "@mui/material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { ListFilters } from "@/components/admin/list-filters";
import { AlbumList } from "@/components/admin/album-list";
import { DashedAddButton } from "@/components/admin/dashed-add-button";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { Prisma } from "@prisma/client";

interface YearGalleryPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string }>;
}

async function getYear(id: string) {
    return db.year.findUnique({
        where: { id },
        select: { id: true, year: true, title: true },
    });
}

async function getAlbums(yearId: string, filters: { q?: string }) {
    const where: Prisma.AlbumWhereInput = { yearId };

    if (filters.q) {
        where.OR = [
            { title: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
        ];
    }

    return db.album.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        include: {
            year: {
                select: { year: true, title: true },
            },
        },
    });
}

export default async function YearGalleryPage({
    params,
    searchParams,
}: YearGalleryPageProps) {
    const { id } = await params;
    const search = await searchParams;
    const [year, albums] = await Promise.all([
        getYear(id),
        getAlbums(id, search),
    ]);

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
                    { label: "Galerie" },
                ]}
                title="Galerie"
            />

            {/* toolbar */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                    flexWrap: "wrap",
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: p.ink2,
                        backgroundColor: p.surface3,
                        px: "9px",
                        py: "3px",
                        borderRadius: "6px",
                    }}
                >
                    Celkem {albums.length} alb
                </Box>
                <Box sx={{ flex: 1 }} />
                <DashedAddButton href={`/admin/rocniky/${id}/galerie/nove`}>
                    Nové album
                </DashedAddButton>
            </Box>

            <ListFilters searchPlaceholder="Hledat alba..." />

            {albums.length === 0 ? (
                <Box
                    sx={{
                        backgroundColor: p.surface,
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        py: 7.5,
                        px: 3,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ color: p.ink3 }}>
                        {search.q
                            ? "Žádná alba neodpovídají filtru."
                            : "Zatím nebyla vytvořena žádná alba pro tento ročník."}
                    </Typography>
                </Box>
            ) : (
                <AlbumList
                    albums={albums}
                    editBasePath={`/admin/rocniky/${id}/galerie`}
                    showYear={false}
                />
            )}
        </Container>
    );
}
