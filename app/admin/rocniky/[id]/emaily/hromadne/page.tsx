import {
    Box,
    Container,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { notFound } from "next/navigation";
import type { EmailQueueItemStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { buildCampaignPlaceholders } from "@/lib/services/email-campaign";
import { CAMPAIGN_STATUS_CONFIG } from "./campaign-status";
import { MassEmailComposer } from "./mass-email-composer";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

export const dynamic = "force-dynamic";

// Builder-palette status tones keyed to campaign status meaning.
const CAMPAIGN_BADGE: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: p.surface3, fg: p.ink2 },
    SENDING: { bg: p.field, fg: p.fieldInk },
    PAUSED: { bg: p.warnSoft, fg: p.warnInk },
    COMPLETED: { bg: p.value, fg: p.valueInk },
};

function StatusBadge({
    label,
    bg,
    fg,
}: {
    label: string | number;
    bg: string;
    fg: string;
}) {
    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                px: "9px",
                py: "3px",
                borderRadius: "20px",
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: bg,
                color: fg,
                whiteSpace: "nowrap",
            }}
        >
            <Box
                component="span"
                sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "currentColor",
                }}
            />
            {label}
        </Box>
    );
}

const ghostLinkSx = {
    borderRadius: "10px",
    textTransform: "none",
    border: `1px solid ${p.line}`,
    color: p.ink2,
    backgroundColor: p.surface,
    boxShadow: "none",
    "&:hover": {
        borderColor: p.ink3,
        backgroundColor: p.surface2,
        boxShadow: "none",
    },
};

interface HromadnePageProps {
    params: Promise<{ id: string }>;
}

export default async function HromadnePage({ params }: HromadnePageProps) {
    await requireAdmin();

    const { id } = await params;
    const [year, emailAccounts, availablePlaceholders] = await Promise.all([
        db.year.findUnique({
            where: { id },
            select: { id: true, year: true },
        }),
        db.emailAccount.findMany({
            select: { id: true, email: true, label: true, isMain: true },
            orderBy: [{ isMain: "desc" }, { email: "asc" }],
        }),
        buildCampaignPlaceholders(id),
    ]);

    if (!year) {
        notFound();
    }

    const campaigns = await db.emailCampaign.findMany({
        where: { yearId: id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            status: true,
            totalCount: true,
            createdAt: true,
        },
    });

    const counts = await db.emailQueueItem.groupBy({
        by: ["campaignId", "status"],
        where: { campaignId: { in: campaigns.map((c) => c.id) } },
        _count: { _all: true },
    });

    function countFor(
        campaignId: string,
        status: EmailQueueItemStatus
    ): number {
        return (
            counts.find(
                (c) => c.campaignId === campaignId && c.status === status
            )?._count._all ?? 0
        );
    }

    return (
        <Container maxWidth="lg">
            <PageHeader
                breadcrumbs={[
                    { label: "Ročníky", href: "/admin/rocniky" },
                    {
                        label: `${year.year}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    {
                        label: "Emaily",
                        href: `/admin/rocniky/${year.id}/emaily`,
                    },
                    { label: "Hromadné emaily" },
                ]}
                title="Hromadné emaily"
            />

            <MassEmailComposer
                yearId={year.id}
                emailAccounts={emailAccounts}
                availablePlaceholders={availablePlaceholders}
            />

            <Typography
                sx={{
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: p.ink3,
                    fontWeight: 700,
                    mb: 2,
                }}
            >
                Historie
            </Typography>

            {campaigns.length === 0 ? (
                <Box
                    sx={{
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        textAlign: "center",
                        color: p.ink3,
                        py: 4,
                        px: 3,
                        fontSize: "0.9rem",
                    }}
                >
                    Zatím žádné hromadné emaily.
                </Box>
            ) : (
                <Box
                    sx={{
                        backgroundColor: p.surface,
                        border: `1px solid ${p.line}`,
                        borderRadius: "14px",
                        overflow: "hidden",
                    }}
                >
                    <Table
                        sx={{
                            "& .MuiTableHead-root .MuiTableCell-root": {
                                backgroundColor: p.surface2,
                                color: p.ink3,
                                textTransform: "uppercase",
                                fontSize: 10,
                                letterSpacing: "0.12em",
                                fontWeight: 700,
                                borderBottom: `1px solid ${p.line}`,
                            },
                            "& .MuiTableBody-root .MuiTableCell-root": {
                                borderBottomColor: p.lineSoft,
                                color: p.ink,
                            },
                            "& .MuiTableBody-root .MuiTableRow-root:hover": {
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Předmět</TableCell>
                                <TableCell>Stav</TableCell>
                                <TableCell>Odesláno</TableCell>
                                <TableCell>Neúspěšné</TableCell>
                                <TableCell>Vytvořeno</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {campaigns.map((campaign) => {
                                const statusConfig =
                                    CAMPAIGN_STATUS_CONFIG[campaign.status] ??
                                    CAMPAIGN_STATUS_CONFIG.DRAFT;
                                const badge =
                                    CAMPAIGN_BADGE[campaign.status] ??
                                    CAMPAIGN_BADGE.DRAFT;
                                const failed = countFor(campaign.id, "FAILED");
                                return (
                                    <TableRow key={campaign.id} hover>
                                        <TableCell>{campaign.name}</TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                label={statusConfig.label}
                                                bg={badge.bg}
                                                fg={badge.fg}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {campaign.status === "DRAFT"
                                                ? "—"
                                                : `${countFor(campaign.id, "SENT")} / ${campaign.totalCount}`}
                                        </TableCell>
                                        <TableCell>
                                            {failed > 0 ? (
                                                <StatusBadge
                                                    label={failed}
                                                    bg={p.neg}
                                                    fg={p.negInk}
                                                />
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {campaign.createdAt.toLocaleDateString(
                                                "cs-CZ"
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <LinkButton
                                                href={`/admin/rocniky/${year.id}/emaily/hromadne/${campaign.id}`}
                                                variant="outlined"
                                                size="small"
                                                sx={ghostLinkSx}
                                            >
                                                Detail
                                            </LinkButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Container>
    );
}
