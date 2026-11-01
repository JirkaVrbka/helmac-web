import { Container, Typography, Box } from "@mui/material";
import { AccountBalance, Email, PrivacyTip } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { requireAdmin } from "@/lib/auth";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface SettingsItem {
    icon: SvgIconComponent;
    title: string;
    description: string;
    href: string;
    action: string;
}

const SETTINGS_ITEMS: SettingsItem[] = [
    {
        icon: PrivacyTip,
        title: "GDPR",
        description: "Správa obsahu stránky ochrany osobních údajů",
        href: "/admin/nastaveni/gdpr",
        action: "Upravit",
    },
    {
        icon: Email,
        title: "Emailové účty",
        description: "Správa SMTP účtů pro odesílání emailů",
        href: "/admin/nastaveni/emaily",
        action: "Spravovat",
    },
    {
        icon: AccountBalance,
        title: "Banka",
        description: "Bankovní účet a Fio API synchronizace",
        href: "/admin/nastaveni/banka",
        action: "Spravovat",
    },
];

export default async function NastaveniPage() {
    await requireAdmin();

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[{ label: "Nastavení" }]}
                title="Nastavení"
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {SETTINGS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Box
                            key={item.href}
                            sx={{
                                backgroundColor: p.surface,
                                border: `1px solid ${p.line}`,
                                borderRadius: "14px",
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    p: 2.5,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        minWidth: 0,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: "12px",
                                            backgroundColor: p.indigoSoft,
                                            color: p.indigo,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon />
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "1.05rem",
                                                fontWeight: 700,
                                                color: p.ink,
                                            }}
                                        >
                                            {item.title}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: "0.875rem",
                                                color: p.ink2,
                                            }}
                                        >
                                            {item.description}
                                        </Typography>
                                    </Box>
                                </Box>
                                <LinkButton
                                    href={item.href}
                                    sx={{
                                        flexShrink: 0,
                                        backgroundColor: p.surface,
                                        border: `1px solid ${p.line}`,
                                        color: p.ink2,
                                        borderRadius: "10px",
                                        "&:hover": {
                                            borderColor: p.indigo,
                                            backgroundColor: p.indigoSoft,
                                            color: p.indigo,
                                        },
                                    }}
                                >
                                    {item.action}
                                </LinkButton>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Container>
    );
}
