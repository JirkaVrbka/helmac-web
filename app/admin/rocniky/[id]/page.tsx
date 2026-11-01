import { Box, Container, Typography } from "@mui/material";
import { AppRegistration } from "@mui/icons-material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { formatDateRange } from "@/lib/utils/date";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface EditYearPageProps {
    params: Promise<{ id: string }>;
}

async function getYearOverview(id: string) {
    return db.year.findUnique({
        where: { id },
        select: {
            id: true,
            year: true,
            title: true,
            registrationOpen: true,
            startDate: true,
            endDate: true,
            _count: {
                select: {
                    registrationSubmissions: {
                        where: { isTest: false },
                    },
                },
            },
        },
    });
}

export default async function EditYearPage({ params }: EditYearPageProps) {
    const { id } = await params;
    const year = await getYearOverview(id);

    if (!year) {
        notFound();
    }

    return (
        <Container maxWidth="lg">
            <PageHeader
                breadcrumbs={[
                    { label: "Ročníky", href: "/admin/rocniky" },
                    { label: `${year.year} - ${year.title}` },
                ]}
                title="Přehled"
            />

            <Box sx={{ mb: 3 }}>
                <Typography
                    sx={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: p.ink,
                    }}
                >
                    Ročník {year.year} — {year.title}
                </Typography>
                {formatDateRange(year.startDate, year.endDate) && (
                    <Typography sx={{ fontSize: "0.9rem", color: p.ink2 }}>
                        {formatDateRange(year.startDate, year.endDate)}
                    </Typography>
                )}
            </Box>

            {/* Registration status banner */}
            <Box
                sx={{
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    p: 2.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                }}
            >
                <AppRegistration
                    sx={{
                        color: year.registrationOpen ? p.valueInk : p.ink3,
                    }}
                />
                <Typography sx={{ flex: 1, fontSize: "0.95rem", color: p.ink }}>
                    Registrace je{" "}
                    <strong>
                        {year.registrationOpen ? "otevřena" : "uzavřena"}
                    </strong>
                </Typography>
                <Box
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        fontWeight: 600,
                        color: p.ink2,
                        backgroundColor: p.surface3,
                        px: "10px",
                        py: "4px",
                        borderRadius: "6px",
                    }}
                >
                    {year._count.registrationSubmissions} přihlášek
                </Box>
                <LinkButton
                    href={`/admin/rocniky/${year.id}/registrace`}
                    size="small"
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        backgroundColor: p.surface,
                        border: `1px solid ${p.line}`,
                        color: p.ink2,
                        "&:hover": {
                            borderColor: p.ink3,
                            backgroundColor: p.surface2,
                        },
                    }}
                >
                    Spravovat
                </LinkButton>
            </Box>
        </Container>
    );
}
