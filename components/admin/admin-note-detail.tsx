"use client";

import { useState, useTransition } from "react";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";
import { Edit, Save, Close } from "@mui/icons-material";
import { updateAdminNote } from "@/lib/actions/registration-submissions";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface AdminNoteDetailProps {
    submissionId: string;
    adminNote: string | null;
}

export function AdminNoteDetail({
    submissionId,
    adminNote,
}: AdminNoteDetailProps) {
    const [editing, setEditing] = useState(false);
    const [note, setNote] = useState(adminNote ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleEdit = () => {
        setNote(adminNote ?? "");
        setError(null);
        setEditing(true);
    };

    const handleCancel = () => {
        setEditing(false);
        setError(null);
    };

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateAdminNote(submissionId, note.trim());
            if (result.error) {
                setError(result.error);
            } else {
                setEditing(false);
            }
        });
    };

    if (editing) {
        return (
            <Box>
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
                    sx={{ ...builderFieldSx, mb: 2 }}
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<Save />}
                        onClick={handleSave}
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
                    <Button
                        size="small"
                        startIcon={<Close />}
                        onClick={handleCancel}
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
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            <Typography
                variant="body2"
                sx={{
                    mb: 2,
                    whiteSpace: "pre-wrap",
                    color: adminNote ? p.ink : p.ink3,
                }}
            >
                {adminNote || "Žádná poznámka"}
            </Typography>
            <Button
                size="small"
                startIcon={<Edit />}
                onClick={handleEdit}
                sx={{
                    color: p.indigo,
                    borderRadius: "10px",
                    textTransform: "none",
                    "&:hover": { backgroundColor: p.indigoSoft },
                }}
            >
                {adminNote ? "Upravit" : "Přidat poznámku"}
            </Button>
        </Box>
    );
}
