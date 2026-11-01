"use client";

import { useState, useTransition } from "react";
import {
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Tooltip,
    Alert,
} from "@mui/material";
import { StickyNote2 } from "@mui/icons-material";
import { updateAdminNote } from "@/lib/actions/registration-submissions";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface AdminNoteButtonProps {
    submissionId: string;
    adminNote: string | null;
}

export function AdminNoteButton({
    submissionId,
    adminNote,
}: AdminNoteButtonProps) {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(adminNote ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const hasNote = !!adminNote;

    const handleOpen = () => {
        setNote(adminNote ?? "");
        setError(null);
        setOpen(true);
    };

    const handleClose = () => {
        if (!isPending) {
            setOpen(false);
        }
    };

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateAdminNote(submissionId, note.trim());
            if (result.error) {
                setError(result.error);
            } else {
                setOpen(false);
            }
        });
    };

    return (
        <>
            <Tooltip title={hasNote ? "Poznámka" : "Přidat poznámku"}>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpen();
                    }}
                    sx={{
                        borderRadius: "8px",
                        color: hasNote ? p.indigo : p.ink3,
                        "&:hover": {
                            color: p.indigo,
                            backgroundColor: p.indigoSoft,
                        },
                    }}
                >
                    <StickyNote2 fontSize="small" />
                </IconButton>
            </Tooltip>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                onClick={(e) => e.stopPropagation()}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Poznámka admina
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        multiline
                        minRows={3}
                        maxRows={10}
                        fullWidth
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Zadejte poznámku..."
                        sx={{ ...builderFieldSx, mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        sx={{
                            color: p.ink2,
                            borderRadius: "10px",
                            border: `1px solid ${p.line}`,
                            "&:hover": {
                                borderColor: p.ink3,
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={isPending}
                        disableElevation
                        sx={{
                            borderRadius: "10px",
                            backgroundColor: p.indigo,
                            "&:hover": { backgroundColor: "#4338ca" },
                        }}
                    >
                        {isPending ? "Ukládání..." : "Uložit"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
