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
    DialogTitle,
    Typography,
} from "@mui/material";
import { Send } from "@mui/icons-material";
import {
    createCampaign,
    previewRecipients,
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
    "&:hover": { borderColor: p.ink3, backgroundColor: p.surface2 },
};

const indigoBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    backgroundColor: p.indigo,
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
};

interface MassEmailSendConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    yearId: string;
    filter: RecipientFilter;
    groupLabel: string;
    subject: string;
    body: string;
    accountId: string | null;
}

export function MassEmailSendConfirmDialog({
    open,
    onClose,
    yearId,
    filter,
    groupLabel,
    subject,
    body,
    accountId,
}: MassEmailSendConfirmDialogProps) {
    const router = useRouter();
    const [count, setCount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [isSending, startSending] = useTransition();

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setCount(null);
        setError(null);
        setDraftId(null);
        previewRecipients(yearId, filter).then((result) => {
            if (cancelled) return;
            if (result.error) {
                setError(result.error);
                return;
            }
            setCount(result.count ?? 0);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleClose = () => {
        if (!isSending) {
            onClose();
        }
    };

    const handleSend = () => {
        setError(null);
        startSending(async () => {
            // Reuse the draft from a previous failed attempt instead of
            // creating a duplicate
            let campaignId = draftId;
            if (!campaignId) {
                const created = await createCampaign(yearId, {
                    name: subject.slice(0, 200),
                    subject,
                    body,
                    accountId: accountId || null,
                    recipientFilter: filter,
                });
                if (created.error || !created.id) {
                    setError(created.error ?? "Nepodařilo se odeslat");
                    return;
                }
                campaignId = created.id;
            }

            const started = await startCampaign(campaignId);
            if (started.error) {
                // The record survives as a draft — stay here so the admin
                // sees the error, and offer a link to retry from the detail
                setDraftId(campaignId);
                setError(
                    `${started.error}. Email byl uložen jako koncept — odeslání můžete zopakovat z jeho detailu.`
                );
                return;
            }
            router.push(
                `/admin/rocniky/${yearId}/emaily/hromadne/${campaignId}`
            );
            router.refresh();
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: "14px" } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                Odeslat hromadný email?
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        mt: 1,
                    }}
                >
                    {count === null && !error ? (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                            }}
                        >
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">
                                Načítání příjemců...
                            </Typography>
                        </Box>
                    ) : count !== null ? (
                        <Typography>
                            Filtru aktuálně odpovídá <strong>{count}</strong>{" "}
                            příjemců (skupina: {groupLabel}). Přesný počet se
                            určí při odeslání. Odesílání probíhá na pozadí a
                            kvůli limitům poskytovatele může trvat déle.
                        </Typography>
                    ) : null}

                    <Box>
                        <Typography
                            variant="body2"
                            sx={{ color: p.ink3, mb: 0.5 }}
                        >
                            Předmět
                        </Typography>
                        <Typography sx={{ fontWeight: 500, color: p.ink }}>
                            {subject}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography
                            variant="body2"
                            sx={{ color: p.ink3, mb: 0.5 }}
                        >
                            Text emailu
                        </Typography>
                        <Box
                            sx={{
                                border: `1px solid ${p.line}`,
                                borderRadius: "10px",
                                p: 2,
                                maxHeight: 300,
                                overflowY: "auto",
                            }}
                            // Admin trust boundary: body is HTML authored by an
                            // admin in the Tiptap editor and is exactly what
                            // gets emailed — no untrusted input reaches here.
                            dangerouslySetInnerHTML={{ __html: body }}
                        />
                    </Box>

                    {count === 0 && (
                        <Alert severity="warning">
                            Vybrané skupině neodpovídají žádní příjemci.
                        </Alert>
                    )}
                    {error && (
                        <Alert
                            severity="error"
                            action={
                                draftId ? (
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => {
                                            router.push(
                                                `/admin/rocniky/${yearId}/emaily/hromadne/${draftId}`
                                            );
                                            router.refresh();
                                        }}
                                    >
                                        Přejít na koncept
                                    </Button>
                                ) : undefined
                            }
                        >
                            {error}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleClose}
                    disabled={isSending}
                    sx={ghostBtnSx}
                >
                    Zrušit
                </Button>
                <Button
                    variant="contained"
                    disableElevation
                    startIcon={
                        isSending ? <CircularProgress size={18} /> : <Send />
                    }
                    onClick={handleSend}
                    disabled={isSending || !count}
                    sx={indigoBtnSx}
                >
                    {isSending
                        ? "Odesílání..."
                        : count
                          ? `Odeslat (${count})`
                          : "Odeslat"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
