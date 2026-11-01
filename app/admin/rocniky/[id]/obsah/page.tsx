import { Container, Typography, Box, Grid } from "@mui/material";
import {
    CalendarMonth,
    ViewList,
    Newspaper,
    PhotoLibrary,
    Add,
    ChevronRight,
} from "@mui/icons-material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface ObsahPageProps {
    params: Promise<{ id: string }>;
}

async function getYearContent(id: string) {
    return db.year.findUnique({
        where: { id },
        select: {
            id: true,
            year: true,
            title: true,
            _count: {
                select: {
                    programDays: true,
                    sectionTypes: true,
                    news: true,
                    albums: true,
                },
            },
        },
    });
}

interface StatCardProps {
    label: string;
    count: number;
    unit: string;
    href: string;
    icon: React.ReactNode;
}

function StatCard({ label, count, unit, href, icon }: StatCardProps) {
    return (
        <Grid item xs={6} sm={4} md={3}>
            <Box
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    p: "18px 20px",
                    transition: "box-shadow 140ms ease",
                    "&:hover": {
                        boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
                    },
                }}
            >
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "11px",
                        backgroundColor: p.indigoSoft,
                        color: p.indigo,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "& svg": { fontSize: 20 },
                    }}
                >
                    {icon}
                </Box>
                <Typography
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "1.7rem",
                        fontWeight: 700,
                        lineHeight: 1.1,
                        color: p.ink,
                    }}
                >
                    {count}
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: p.ink2 }}>
                    {unit}
                </Typography>
                <LinkButton
                    href={href}
                    size="small"
                    endIcon={<ChevronRight sx={{ fontSize: 16 }} />}
                    sx={{
                        mt: "4px",
                        alignSelf: "flex-start",
                        textTransform: "none",
                        color: p.indigo,
                        "&:hover": { backgroundColor: p.indigoSoft },
                    }}
                >
                    {label}
                </LinkButton>
            </Box>
        </Grid>
    );
}

const dashedActionSx = {
    textTransform: "none",
    backgroundColor: p.surface,
    border: `1px dashed ${p.line}`,
    borderRadius: "10px",
    color: p.indigo,
    fontWeight: 600,
    "&:hover": {
        borderColor: p.indigo,
        borderStyle: "dashed",
        backgroundColor: p.indigoSoft,
    },
} as const;

export default async function ObsahPage({ params }: ObsahPageProps) {
    const { id } = await params;
    const year = await getYearContent(id);

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
                    { label: "Obsah" },
                ]}
                title="Obsah"
            />

            {/* Stats cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <StatCard
                    label="Program"
                    count={year._count.programDays}
                    unit="dnů"
                    href={`/admin/rocniky/${year.id}/program`}
                    icon={<CalendarMonth />}
                />
                <StatCard
                    label="Sekce"
                    count={year._count.sectionTypes}
                    unit="typů sekcí"
                    href={`/admin/rocniky/${year.id}/sekce`}
                    icon={<ViewList />}
                />
                <StatCard
                    label="Novinky"
                    count={year._count.news}
                    unit="novinek"
                    href={`/admin/rocniky/${year.id}/novinky`}
                    icon={<Newspaper />}
                />
                <StatCard
                    label="Galerie"
                    count={year._count.albums}
                    unit="alb"
                    href={`/admin/rocniky/${year.id}/galerie`}
                    icon={<PhotoLibrary />}
                />
            </Grid>

            {/* Quick actions */}
            <Box
                sx={{
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        borderBottom: `1px solid ${p.line}`,
                        background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 11,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            color: p.ink3,
                        }}
                    >
                        Rychlé akce
                    </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/program/novy-den`}
                            variant="outlined"
                            size="small"
                            startIcon={<Add />}
                            sx={dashedActionSx}
                        >
                            Nový den programu
                        </LinkButton>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/sekce`}
                            variant="outlined"
                            size="small"
                            startIcon={<Add />}
                            sx={dashedActionSx}
                        >
                            Spravovat sekce
                        </LinkButton>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/novinky/nova`}
                            variant="outlined"
                            size="small"
                            startIcon={<Add />}
                            sx={dashedActionSx}
                        >
                            Nová novinka
                        </LinkButton>
                        <LinkButton
                            href={`/admin/rocniky/${year.id}/galerie/nove`}
                            variant="outlined"
                            size="small"
                            startIcon={<Add />}
                            sx={dashedActionSx}
                        >
                            Nové album
                        </LinkButton>
                    </Box>
                </Box>
            </Box>
        </Container>
    );
}
