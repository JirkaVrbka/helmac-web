"use client";

import { useState } from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { Save } from "@mui/icons-material";
import { BlockEditor } from "@/components/admin/block-editor";
import { updateRegistrationSuccessContent } from "@/lib/actions/years";
import type { ContentBlock } from "@/lib/types/content-blocks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface RegistrationSuccessContentEditorProps {
    yearId: string;
    initialContent: ContentBlock[];
}

export function RegistrationSuccessContentEditor({
    yearId,
    initialContent,
}: RegistrationSuccessContentEditorProps) {
    const [blocks, setBlocks] = useState<ContentBlock[]>(initialContent);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData();
        formData.set("content", JSON.stringify(blocks));

        const result = await updateRegistrationSuccessContent(yearId, formData);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }

        setSaving(false);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="contained"
                    startIcon={
                        saving ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            <Save />
                        )
                    }
                    onClick={handleSave}
                    disabled={saving}
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
                    {saving ? "Ukládám..." : "Uložit"}
                </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">Obsah byl uložen</Alert>}

            <BlockEditor value={blocks} onChange={setBlocks} yearId={yearId} />
        </Box>
    );
}
