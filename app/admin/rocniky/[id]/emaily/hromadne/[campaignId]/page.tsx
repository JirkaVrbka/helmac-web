import {
    Alert,
    Box,
    Container,
    LinearProgress,
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
import { recipientFilterSchema } from "@/lib/validators/email-campaign";
import { CampaignForm } from "../campaign-form";
import { buildCampaignPlaceholders } from "@/lib/services/email-campaign";
import { EMAIL_QUEUE_CONFIG } from "@/lib/utils/email-queue";
import { CAMPAIGN_STATUS_CONFIG } from "../campaign-status";
import { CampaignDetailActions } from "./campaign-detail-actions";
import { MassEmailRecipientList } from "./mass-email-recipient-list";
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
    label: string;
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

const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
    mb: 2.25,
};

const paneHeadSx = {
    px: 2.5,
    py: 1.75,
    borderBottom: `1px solid ${p.line}`,
    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
};

const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: p.ink3,
    fontWeight: 700,
    flex: 1,
};

// A SENDING campaign whose lock is idle this long with items still pending
// most likely lost its self-invocation chain. Centralized in EMAIL_QUEUE_CONFIG
// alongside the queue's other timing constants to keep them from drifting.
function isLockIdleTooLong(lockIdleSince: Date): boolean {
    return (
        Date.now() - lockIdleSince.getTime() >
        EMAIL_QUEUE_CONFIG.stalledAfterMs()
    );
}

interface KampanDetailPageProps {
    params: Promise<{ id: string; campaignId: string }>;
}

export default async function KampanDetailPage({
    params,
}: KampanDetailPageProps) {
    await requireAdmin();

    const { id, campaignId } = await params;

    const campaign = await db.emailCampaign.findUnique({
        where: { id: campaignId },
        select: {
            id: true,
            yearId: true,
            name: true,
            subject: true,
            body: true,
            bcc: true,
            accountId: true,
            status: true,
            recipientFilter: true,
            totalCount: true,
            lockedAt: true,
            startedAt: true,
            completedAt: true,
            updatedAt: true,
            year: { select: { year: true } },
        },
    });

    if (!campaign || campaign.yearId !== id) {
        notFound();
    }

    const statusConfig =
        CAMPAIGN_STATUS_CONFIG[campaign.status] ?? CAMPAIGN_STATUS_CONFIG.DRAFT;

    const breadcrumbs = [
        { label: "Ročníky", href: "/admin/rocniky" },
        { label: `${campaign.year.year}`, href: `/admin/rocniky/${id}` },
        { label: "Emaily", href: `/admin/rocniky/${id}/emaily` },
        {
            label: "Hromadné emaily",
            href: `/admin/rocniky/${id}/emaily/hromadne`,
        },
        { label: campaign.name },
    ];

    if (campaign.status === "DRAFT") {
        const [emailAccounts, availablePlaceholders] = await Promise.all([
            db.emailAccount.findMany({
                select: { id: true, email: true, label: true, isMain: true },
                orderBy: [{ isMain: "desc" }, { email: "asc" }],
            }),
            buildCampaignPlaceholders(id),
        ]);

        const filter = recipientFilterSchema.safeParse(
            campaign.recipientFilter
        );

        return (
            <Container maxWidth="xl">
                <PageHeader breadcrumbs={breadcrumbs} title={campaign.name} />

                <CampaignForm
                    yearId={id}
                    emailAccounts={emailAccounts}
                    availablePlaceholders={availablePlaceholders}
                    campaign={{
                        id: campaign.id,
                        name: campaign.name,
                        subject: campaign.subject,
                        body: campaign.body,
                        bcc: campaign.bcc,
                        accountId: campaign.accountId,
                        recipientFilter: filter.success
                            ? filter.data
                            : { statuses: ["CONFIRMED"], paid: "all" },
                    }}
                />

                <CampaignDetailActions
                    campaignId={campaign.id}
                    yearId={id}
                    status={campaign.status}
                    stalled={false}
                    failedCount={0}
                    recipientFilter={filter.success ? filter.data : undefined}
                />
            </Container>
        );
    }

    const counts = await db.emailQueueItem.groupBy({
        by: ["status"],
        where: { campaignId: campaign.id },
        _count: { _all: true },
    });
    const countFor = (status: EmailQueueItemStatus) =>
        counts.find((c) => c.status === status)?._count._all ?? 0;

    const sentCount = countFor("SENT");
    const failedCount = countFor("FAILED");
    const pendingCount = countFor("PENDING") + countFor("SENDING");

    const lockIdleSince = campaign.lockedAt ?? campaign.updatedAt;
    const stalled =
        campaign.status === "SENDING" &&
        pendingCount > 0 &&
        isLockIdleTooLong(lockIdleSince);

    const failedItems =
        failedCount > 0
            ? await db.emailQueueItem.findMany({
                  where: { campaignId: campaign.id, status: "FAILED" },
                  orderBy: { updatedAt: "desc" },
                  take: 50,
                  select: {
                      id: true,
                      recipient: true,
                      attempts: true,
                      lastError: true,
                  },
              })
            : [];

    const recipientItems = await db.emailQueueItem.findMany({
        where: { campaignId: campaign.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, recipient: true, status: true, sentAt: true },
    });

    const progress =
        campaign.totalCount > 0 ? (sentCount / campaign.totalCount) * 100 : 0;

    return (
        <Container maxWidth="lg">
            <PageHeader breadcrumbs={breadcrumbs} title={campaign.name} />

            {stalled && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Odesílání se zřejmě zastavilo. Pokračujte tlačítkem níže —
                    fronta se také automaticky obnoví při nočním zpracování.
                </Alert>
            )}

            <Box sx={{ ...paneSx, mb: 2.25 }}>
                <Box sx={{ p: 2.5 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <StatusBadge
                            label={statusConfig.label}
                            bg={
                                (
                                    CAMPAIGN_BADGE[campaign.status] ??
                                    CAMPAIGN_BADGE.DRAFT
                                ).bg
                            }
                            fg={
                                (
                                    CAMPAIGN_BADGE[campaign.status] ??
                                    CAMPAIGN_BADGE.DRAFT
                                ).fg
                            }
                        />
                        <Typography variant="body2" sx={{ color: p.ink3 }}>
                            Předmět: {campaign.subject}
                        </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1, color: p.ink }}>
                        Odesláno {sentCount} z {campaign.totalCount}
                        {failedCount > 0 && ` · neúspěšných: ${failedCount}`}
                        {pendingCount > 0 && ` · ve frontě: ${pendingCount}`}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 8,
                            borderRadius: "6px",
                            mb: 2,
                            backgroundColor: p.surface3,
                            "& .MuiLinearProgress-bar": {
                                backgroundColor: p.indigo,
                                borderRadius: "6px",
                            },
                        }}
                    />

                    {campaign.startedAt && (
                        <Typography variant="body2" sx={{ color: p.ink3 }}>
                            Spuštěno:{" "}
                            {campaign.startedAt.toLocaleString("cs-CZ")}
                            {campaign.completedAt &&
                                ` · Dokončeno: ${campaign.completedAt.toLocaleString("cs-CZ")}`}
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ ...paneSx, mb: 2.25 }}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>Text emailu</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <Box
                        sx={{
                            border: `1px solid ${p.line}`,
                            borderRadius: "10px",
                            p: 2,
                            maxHeight: 300,
                            overflowY: "auto",
                        }}
                        // Admin trust boundary: body is admin-authored Tiptap
                        // HTML and is exactly what gets emailed — no untrusted
                        // input reaches here.
                        dangerouslySetInnerHTML={{ __html: campaign.body }}
                    />
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <MassEmailRecipientList
                    items={recipientItems.map((item) => ({
                        id: item.id,
                        recipient: item.recipient,
                        status: item.status,
                        sentAt: item.sentAt
                            ? item.sentAt.toLocaleString("cs-CZ")
                            : null,
                    }))}
                />
            </Box>

            <CampaignDetailActions
                campaignId={campaign.id}
                yearId={id}
                status={campaign.status}
                stalled={stalled}
                failedCount={failedCount}
            />

            {failedItems.length > 0 && (
                <Box sx={{ ...paneSx, mt: 3, mb: 0 }}>
                    <Box sx={paneHeadSx}>
                        <Typography sx={kickerSx}>Neúspěšné emaily</Typography>
                    </Box>
                    <Table
                        size="small"
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
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Příjemce</TableCell>
                                <TableCell>Pokusů</TableCell>
                                <TableCell>Chyba</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {failedItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.recipient}</TableCell>
                                    <TableCell>{item.attempts}</TableCell>
                                    <TableCell
                                        sx={{
                                            maxWidth: 400,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            color: `${p.ink3} !important`,
                                        }}
                                    >
                                        {item.lastError ?? "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {failedCount > failedItems.length && (
                        <Typography
                            variant="body2"
                            sx={{ color: p.ink3, p: 2, pt: 1.5 }}
                        >
                            Zobrazeno prvních {failedItems.length} z{" "}
                            {failedCount}.
                        </Typography>
                    )}
                </Box>
            )}
        </Container>
    );
}
