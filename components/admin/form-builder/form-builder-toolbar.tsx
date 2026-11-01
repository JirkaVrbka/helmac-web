"use client";

import { Box, Button, Typography } from "@mui/material";
import {
    ContentCopy,
    Save,
    TuneOutlined,
    Visibility,
} from "@mui/icons-material";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface Props {
    saving: boolean;
    previewSaving: boolean;
    canSave: boolean;
    canPreview: boolean;
    previewToken: string | null;
    readOnly?: boolean;
    onSave: () => void;
    onPreview: () => void;
}

const ghostButtonSx = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    transition: "all 140ms ease",
    "&:hover": {
        borderColor: p.ink3,
        backgroundColor: p.surface2,
    },
} as const;

const indigoButtonSx = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    backgroundColor: p.indigo,
    color: "#fff",
    boxShadow: "none",
    transition: "all 140ms ease",
    "&:hover": {
        backgroundColor: "#4338ca",
        boxShadow: "none",
    },
} as const;

export function FormBuilderToolbar({
    saving,
    previewSaving,
    canSave,
    canPreview,
    previewToken,
    readOnly = false,
    onSave,
    onPreview,
}: Props) {
    return (
        <Box
            sx={{
                p: 2,
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
                borderRadius: "14px",
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
            }}
        >
            <TuneOutlined sx={{ color: p.indigo }} />
            <Typography
                sx={{
                    flex: 1,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: p.ink,
                }}
            >
                Registrační formulář
            </Typography>
            <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={onPreview}
                disabled={!canPreview || previewSaving}
                sx={ghostButtonSx}
            >
                {previewSaving ? "Ukládám..." : "Náhled"}
            </Button>
            {previewToken && (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => {
                        const url = `${window.location.origin}/nahled/${previewToken}`;
                        navigator.clipboard.writeText(url);
                    }}
                    sx={ghostButtonSx}
                >
                    Kopírovat odkaz
                </Button>
            )}
            {!readOnly && (
                <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={onSave}
                    disabled={saving || !canSave}
                    sx={indigoButtonSx}
                >
                    {saving ? "Ukládám..." : "Uložit formulář"}
                </Button>
            )}
        </Box>
    );
}
