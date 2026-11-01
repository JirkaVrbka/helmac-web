"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import { Delete, Pause, PlayArrow, Replay, Send } from "@mui/icons-material";
import {
    deleteCampaign,
    pauseCampaign,
    previewRecipients,
    resumeCampaign,
    retryFailedItems,
    startCampaign,
} from "@/lib/actions/email-campaigns";
import type { RecipientFilter } from "@/lib/validators/email-campaign";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const ghostBtnSx = {
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

const indigoBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    backgroundColor: p.indigo,
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
};

const dangerBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    border: `1px solid ${p.line}`,
    color: p.negInk,
    backgroundColor: p.surface,
    boxShadow: "none",
    "&:hover": {
        borderColor: p.negInk,
        backgroundColor: p.neg,
        boxShadow: "none",
    },
};

const softDangerBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    backgroundColor: p.neg,
    color: p.negInk,
    boxShadow: "none",
    "&:hover": { backgroundColor: "#fecaca", boxShadow: "none" },
};

interface CampaignDetailActionsProps {
    campaignId: string;
    yearId: string;
    status: string;
    stalled: boolean;
    failedCount: number;
    recipientFilter?: RecipientFilter;
}

export function CampaignDetailActions({
    campaignId,
    yearId,
    status,
    stalled,
    failedCount,
    recipientFilter,
}: CampaignDetailActionsProps) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();

    // Live progress while the queue is draining
    useEffect(() => {
        if (status !== "SENDING") return;
        const interval = setInterval(() => router.refresh(), 10_000);
        return () => clearInterval(interval);
    }, [status, router]);

    const run = (action: () => Promise<{ error?: string }>) => {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (result.error) {
                setError(result.error);
                return;
            }
            router.refresh();
        });
    };

    const handleOpenConfirm = () => {
        setConfirmOpen(true);
        setRecipientCount(null);
        if (!recipientFilter) return;
        startTransition(async () => {
            const result = await previewRecipients(yearId, recipientFilter);
            if (result.error) {
                setError(result.error);
                return;
            }
            if (result.count !== undefined) {
                setRecipientCount(result.count);
            }
        });
    };

    const handleStart = () => {
        setConfirmOpen(false);
        run(() => startCampaign(campaignId));
    };

    const handleDelete = () => {
        setDeleteOpen(false);
        setError(null);
        startTransition(async () => {
            const result = await deleteCampaign(campaignId);
            if (result.error) {
                setError(result.error);
                return;
            }
            router.push(`/admin/rocniky/${yearId}/emaily/hromadne`);
            router.refresh();
        });
    };

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {status === "DRAFT" && (
                    <Button
                        variant="contained"
                        startIcon={
                            isPending ? (
                                <CircularProgress size={18} />
                            ) : (
                                <Send />
                            )
                        }
                        onClick={handleOpenConfirm}
                        disabled={isPending}
                        sx={indigoBtnSx}
                    >
                        Odeslat hromadný email
                    </Button>
                )}

                {status === "SENDING" && (
                    <Button
                        variant="outlined"
                        startIcon={<Pause />}
                        onClick={() => run(() => pauseCampaign(campaignId))}
                        disabled={isPending}
                        sx={ghostBtnSx}
                    >
                        Pozastavit
                    </Button>
                )}

                {(status === "PAUSED" || stalled) && (
                    <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={() => run(() => resumeCampaign(campaignId))}
                        disabled={isPending}
                        sx={indigoBtnSx}
                    >
                        Pokračovat
                    </Button>
                )}

                {failedCount > 0 && status !== "SENDING" && (
                    <Button
                        variant="outlined"
                        startIcon={<Replay />}
                        onClick={() => run(() => retryFailedItems(campaignId))}
                        disabled={isPending}
                        sx={ghostBtnSx}
                    >
                        Opakovat neúspěšné ({failedCount})
                    </Button>
                )}

                {status === "DRAFT" && (
                    <Button
                        variant="outlined"
                        startIcon={<Delete />}
                        onClick={() => setDeleteOpen(true)}
                        disabled={isPending}
                        sx={dangerBtnSx}
                    >
                        Smazat
                    </Button>
                )}
            </Box>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Odeslat hromadný email?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Hromadný email se začne odesílat všem příjemcům
                        odpovídajícím uloženému filtru. Odesílání je rozloženo v
                        čase kvůli limitům poskytovatele a může trvat i několik
                        hodin.
                        {recipientCount !== null &&
                            ` Počet příjemců: ${recipientCount}.`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        sx={ghostBtnSx}
                    >
                        Zrušit
                    </Button>
                    <Button
                        variant="contained"
                        disableElevation
                        onClick={handleStart}
                        disabled={isPending}
                        sx={indigoBtnSx}
                    >
                        Odeslat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat hromadný email?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Hromadný email a jeho fronta budou trvale odstraněny.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteOpen(false)}
                        sx={ghostBtnSx}
                    >
                        Zrušit
                    </Button>
                    <Button
                        variant="contained"
                        disableElevation
                        onClick={handleDelete}
                        disabled={isPending}
                        sx={softDangerBtnSx}
                    >
                        Smazat
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
