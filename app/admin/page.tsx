import { Container, Typography, Box } from "@mui/material";
import {
    CalendarMonth,
    Article,
    Newspaper,
    PhotoLibrary,
    CheckCircle,
    Warning,
    Edit,
} from "@mui/icons-material";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/link-button";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

async function getStats() {
    const [yearsCount, pagesCount, newsCount, albumsCount] = await Promise.all([
        db.year.count(),
        db.page.count(),
        db.news.count(),
        db.album.count(),
    ]);

    return { yearsCount, pagesCount, newsCount, albumsCount };
}

async function getSetupStatus() {
    const [mainEmail, bankAccount] = await Promise.all([
        db.emailAccount.findFirst({
            where: { isMain: true },
            select: { id: true },
        }),
        db.bankAccount.findFirst({
            select: { bankAccountNumber: true, fioSyncEnabled: true },
        }),
    ]);

    return {
        hasMainEmail: !!mainEmail,
        hasBankAccount: !!bankAccount?.bankAccountNumber,
        hasFioSync: !!bankAccount?.fioSyncEnabled,
    };
}

// Kicker label — the signature section-header treatment (admin design system).
const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: p.ink3,
};

// Pane: white surface, 1px border, 14px radius (admin design system).
const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
};

const paneHeadSx = {
    px: 2.5,
    py: 1.5,
    borderBottom: `1px solid ${p.line}`,
    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
};

export default async function AdminDashboardPage() {
    const session = await auth();
    const isAdminOrAbove =
        session?.user?.role === "ADMIN" ||
        session?.user?.role === "SUPER_ADMIN";

    const [stats, activeYear, setupStatus] = await Promise.all([
        getStats(),
        db.year.findFirst({
            where: { isActive: true, isArchived: false },
            select: { id: true, year: true, title: true },
        }),
        isAdminOrAbove ? getSetupStatus() : null,
    ]);

    const statCards = [
        {
            title: "Ročníky",
            value: stats.yearsCount,
            icon: CalendarMonth,
        },
        {
            title: "Stránky",
            value: stats.pagesCount,
            icon: Article,
        },
        {
            title: "Novinky",
            value: stats.newsCount,
            icon: Newspaper,
        },
        {
            title: "Alba",
            value: stats.albumsCount,
            icon: PhotoLibrary,
        },
    ];

    const setupChecks = setupStatus
        ? [
              {
                  label: "Hlavní emailový účet",
                  ok: setupStatus.hasMainEmail,
                  href: "/admin/nastaveni/emaily",
              },
              {
                  label: "Bankovní účet",
                  ok: setupStatus.hasBankAccount,
                  href: "/admin/nastaveni/banka",
              },
              {
                  label: "Fio synchronizace",
                  ok: setupStatus.hasFioSync,
                  href: "/admin/nastaveni/banka",
              },
          ]
        : null;

    return (
        <Container maxWidth="lg">
            <Typography
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: p.ink,
                    mb: 3,
                }}
            >
                Vítejte, {session?.user?.name || "Admine"}!
            </Typography>

            {/* Stats Tiles */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 2,
                    mb: 3,
                }}
            >
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Box
                            key={card.title}
                            sx={{
                                ...paneSx,
                                p: "18px 20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.75,
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
                                }}
                            >
                                <Icon sx={{ fontSize: 20 }} />
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
                                {card.value}
                            </Typography>
                            <Typography
                                sx={{ fontSize: "0.8rem", color: p.ink2 }}
                            >
                                {card.title}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* Setup Status (ADMIN / SUPER_ADMIN only) */}
            {setupChecks && (
                <Box sx={{ ...paneSx, mb: 2.25 }}>
                    <Box sx={paneHeadSx}>
                        <Typography sx={kickerSx}>Stav nastavení</Typography>
                    </Box>
                    <Box sx={{ px: 2.5, py: 0.5 }}>
                        {setupChecks.map((check, i) => (
                            <Box
                                key={check.label}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    py: 1.25,
                                    borderBottom:
                                        i < setupChecks.length - 1
                                            ? `1px solid ${p.lineSoft}`
                                            : "none",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.25,
                                    }}
                                >
                                    {check.ok ? (
                                        <CheckCircle
                                            fontSize="small"
                                            sx={{ color: p.valueInk }}
                                        />
                                    ) : (
                                        <Warning
                                            fontSize="small"
                                            sx={{ color: p.warnInk }}
                                        />
                                    )}
                                    <Typography
                                        sx={{
                                            fontSize: "0.9rem",
                                            color: p.ink,
                                        }}
                                    >
                                        {check.label}
                                    </Typography>
                                </Box>
                                {!check.ok && (
                                    <LinkButton
                                        href={check.href}
                                        size="small"
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
                                        Nastavit
                                    </LinkButton>
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Active Year */}
            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>Aktuální ročník</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    {activeYear ? (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography sx={{ fontSize: "1rem", color: p.ink }}>
                                {activeYear.title ||
                                    `Ročník ${activeYear.year}`}
                            </Typography>
                            <LinkButton
                                href={`/admin/rocniky/${activeYear.id}`}
                                startIcon={<Edit />}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "10px",
                                    backgroundColor: p.indigo,
                                    color: p.surface,
                                    boxShadow: "none",
                                    "&:hover": {
                                        backgroundColor: "#4338ca",
                                        boxShadow: "none",
                                    },
                                }}
                            >
                                Upravit ročník
                            </LinkButton>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography
                                sx={{ fontSize: "0.9rem", color: p.ink3 }}
                            >
                                Žádný aktivní ročník
                            </Typography>
                            <LinkButton
                                href="/admin/rocniky"
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
                                Spravovat ročníky
                            </LinkButton>
                        </Box>
                    )}
                </Box>
            </Box>
        </Container>
    );
}
