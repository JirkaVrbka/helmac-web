"use client";

import { useState, useTransition } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from "@mui/material";
import { sendTestEmail } from "@/lib/actions/email-test";
import type { EmailConditionalSection } from "@/lib/types/email-sections";
import type { FormField } from "@/lib/types/registration-form";
import type { EmailAttachment } from "@/lib/validators/email-attachment";
import { builderPalette as pal } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface UsedPlaceholder {
    key: string;
    label: string;
}

interface TestEmailDialogProps {
    open: boolean;
    onClose: () => void;
    subject: string;
    body: string;
    bcc: string | null;
    emailAccountId: string | null;
    usedPlaceholders: UsedPlaceholder[];
    sections?: EmailConditionalSection[];
    availableFields?: FormField[];
    attachments?: EmailAttachment[];
}

export function TestEmailDialog({
    open,
    onClose,
    subject,
    body,
    bcc,
    emailAccountId,
    usedPlaceholders,
    sections,
    availableFields,
    attachments,
}: TestEmailDialogProps) {
    const [recipient, setRecipient] = useState("");
    const [values, setValues] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [wasOpen, setWasOpen] = useState(open);

    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) {
            setRecipient("");
            setError(null);
            setSuccess(false);
            setValues(
                Object.fromEntries(usedPlaceholders.map((p) => [p.key, ""]))
            );
        }
    }

    const handleClose = () => {
        if (!isPending) {
            onClose();
        }
    };

    const handleSubmit = () => {
        setError(null);
        setSuccess(false);

        if (!recipient.trim()) {
            setError("Zadejte emailovou adresu příjemce");
            return;
        }

        startTransition(async () => {
            const result = await sendTestEmail({
                subject,
                body,
                bcc,
                emailAccountId,
                recipient: recipient.trim(),
                placeholderValues: values,
                sections,
                allFields: availableFields,
                attachments,
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: "14px" } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                Testovací odeslání emailu
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
                    <TextField
                        label="Příjemce"
                        type="email"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        fullWidth
                        required
                        autoFocus
                        disabled={isPending}
                        placeholder="adresa@example.com"
                        size="small"
                        sx={builderFieldSx}
                    />

                    {usedPlaceholders.length > 0 && (
                        <>
                            <Typography
                                sx={{
                                    textAlign: "center",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    color: pal.ink3,
                                    mt: 1,
                                }}
                            >
                                Hodnoty z registračního formuláře
                            </Typography>
                            {usedPlaceholders.map((p) => (
                                <TextField
                                    key={p.key}
                                    label={p.label}
                                    value={values[p.key] ?? ""}
                                    onChange={(e) =>
                                        setValues((prev) => ({
                                            ...prev,
                                            [p.key]: e.target.value,
                                        }))
                                    }
                                    fullWidth
                                    size="small"
                                    disabled={isPending}
                                    helperText={`{${p.key}}`}
                                    sx={builderFieldSx}
                                />
                            ))}
                        </>
                    )}

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && (
                        <Alert severity="success">
                            Testovací email byl odeslán
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleClose}
                    disabled={isPending}
                    sx={{
                        borderRadius: "10px",
                        textTransform: "none",
                        border: `1px solid ${pal.line}`,
                        color: pal.ink2,
                        backgroundColor: pal.surface,
                        "&:hover": {
                            borderColor: pal.ink3,
                            backgroundColor: pal.surface2,
                        },
                    }}
                >
                    Zrušit
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disableElevation
                    disabled={isPending || !recipient.trim() || success}
                    sx={{
                        borderRadius: "10px",
                        textTransform: "none",
                        backgroundColor: pal.indigo,
                        "&:hover": { backgroundColor: "#4338ca" },
                    }}
                >
                    {isPending ? "Odesílání..." : "Odeslat testovací email"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
