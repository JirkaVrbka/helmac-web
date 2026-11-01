"use client";

import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from "@mui/material";
import { Email, CheckCircle, Cancel } from "@mui/icons-material";
import { resendConfirmationEmail } from "@/lib/actions/registration-submissions";
import { formatDateTime } from "@/lib/utils/date";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface ResendEmailButtonProps {
    submissionId: string;
    emailSent: boolean;
    emailSentAt: Date | null;
}

export function ResendEmailButton({
    submissionId,
    emailSent,
    emailSentAt,
}: ResendEmailButtonProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleResend = async () => {
        setConfirmOpen(false);
        setSending(true);
        setError(null);
        setSuccess(false);

        const result = await resendConfirmationEmail(submissionId);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 5000);
        }

        setSending(false);
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                {emailSent ? (
                    <CheckCircle fontSize="small" sx={{ color: p.valueInk }} />
                ) : (
                    <Cancel fontSize="small" sx={{ color: p.ink3 }} />
                )}
                <Typography variant="body2" sx={{ color: p.ink2 }}>
                    {emailSent
                        ? `Email odeslán ${emailSentAt ? formatDateTime(emailSentAt) : ""}`
                        : "Email nebyl odeslán"}
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 1 }}>
                    Email byl úspěšně odeslán
                </Alert>
            )}

            <Button
                size="small"
                startIcon={<Email />}
                onClick={() => setConfirmOpen(true)}
                disabled={sending}
                sx={{
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    color: p.ink2,
                    borderRadius: "10px",
                    boxShadow: "none",
                    "&:hover": {
                        backgroundColor: p.surface2,
                        borderColor: p.ink3,
                        boxShadow: "none",
                    },
                }}
            >
                {sending ? "Odesílání..." : "Znovu odeslat email"}
            </Button>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Znovu odeslat potvrzovací email?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Potvrzovací email bude znovu odeslán na emailovou adresu
                        z registrace.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        sx={{
                            backgroundColor: p.surface,
                            border: `1px solid ${p.line}`,
                            color: p.ink2,
                            borderRadius: "10px",
                            "&:hover": {
                                backgroundColor: p.surface2,
                                borderColor: p.ink3,
                            },
                        }}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleResend}
                        variant="contained"
                        disableElevation
                        sx={{
                            backgroundColor: p.indigo,
                            color: p.surface,
                            borderRadius: "10px",
                            boxShadow: "none",
                            "&:hover": {
                                backgroundColor: "#4338ca",
                                boxShadow: "none",
                            },
                        }}
                    >
                        Odeslat
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
