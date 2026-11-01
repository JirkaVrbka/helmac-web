import { Container, Typography, Box } from "@mui/material";
import { LinkButton } from "@/components/ui/link-button";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { ListFilters } from "@/components/admin/list-filters";
import { AlbumList } from "@/components/admin/album-list";
import { DashedAddButton } from "@/components/admin/dashed-add-button";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { Prisma } from "@prisma/client";

interface GalleryPageProps {
    searchParams: Promise<{ q?: string; yearId?: string }>;
}

async function getAlbums(filters: { q?: string; yearId?: string }) {
    const where: Prisma.AlbumWhereInput = {};

    if (filters.q) {
        where.OR = [
            { title: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
        ];
    }

    if (filters.yearId) {
        where.yearId = filters.yearId;
    }

    return db.album.findMany({
        where,
        orderBy: [{ year: { year: "desc" } }, { sortOrder: "asc" }],
        include: {
            year: {
                select: { year: true, title: true },
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

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
    const params = await searchParams;
    const [albums, years] = await Promise.all([getAlbums(params), getYears()]);

    return (
        <Container maxWidth="lg">
            <PageHeader breadcrumbs={[{ label: "Galerie" }]} title="Galerie" />

            {years.length > 0 && (
                <>
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
                        <DashedAddButton href="/admin/galerie/nove">
                            Nové album
                        </DashedAddButton>
                    </Box>

                    <ListFilters
                        showYearFilter
                        years={years}
                        searchPlaceholder="Hledat alba..."
                    />
                </>
            )}

            {years.length === 0 ? (
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
                        Nejprve vytvořte ročník pro přidávání alb.
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
                        >
                            Vytvořit ročník
                        </LinkButton>
                    </Box>
                </Box>
            ) : albums.length === 0 ? (
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
                        {params.q || params.yearId
                            ? "Žádná alba neodpovídají filtru."
                            : "Zatím nebyla vytvořena žádná alba."}
                    </Typography>
                </Box>
            ) : (
                <AlbumList albums={albums} />
            )}
        </Container>
    );
}
