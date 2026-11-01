"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Container,
    Typography,
    Alert,
    Box,
    Button,
    CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import Link from "next/link";
import { DynamicRegistrationForm } from "@/components/public/features/registration/DynamicRegistrationForm";
import type { RegistrationFormData } from "@/lib/types/registration-form";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const ghostBtnSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    textTransform: "none",
    borderRadius: "10px",
    "&:hover": { borderColor: p.ink3, backgroundColor: p.surface2 },
} as const;

const infoAlertSx = {
    borderRadius: "12px",
    backgroundColor: p.field,
    color: p.fieldInk,
    "& .MuiAlert-message": { color: p.fieldInk },
} as const;

function readPreviewData(): RegistrationFormData | null {
    try {
        const raw = localStorage.getItem("form-preview-data");
        if (!raw) return null;
        const parsed = JSON.parse(raw) as RegistrationFormData;
        localStorage.removeItem("form-preview-data");
        return parsed;
    } catch {
        return null;
    }
}

export default function FormPreviewPage() {
    const params = useParams<{ id: string }>();
    const [formData, setFormData] = useState<RegistrationFormData | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const data = readPreviewData();
        queueMicrotask(() => {
            setFormData(data);
            setLoaded(true);
        });
    }, []);

    if (!loaded) {
        return (
            <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!formData) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error" sx={{ mb: 2, borderRadius: "12px" }}>
                    Data náhledu nebyla nalezena. Otevřete náhled znovu z
                    editoru formuláře.
                </Alert>
                <Button
                    component={Link}
                    href={`/admin/rocniky/${params.id}/registrace/formular`}
                    startIcon={<ArrowBack />}
                    variant="outlined"
                    sx={ghostBtnSx}
                >
                    Zpět na editor
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Alert icon={false} sx={{ mb: 3, ...infoAlertSx }}>
                Toto je náhled formuláře. Odeslání formuláře nebude
                zaregistrováno.
            </Alert>

            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                    component={Link}
                    href={`/admin/rocniky/${params.id}/registrace/formular`}
                    startIcon={<ArrowBack />}
                    variant="outlined"
                    size="small"
                    sx={ghostBtnSx}
                >
                    Zpět na editor
                </Button>
                <Typography variant="h5" sx={{ fontWeight: 700, color: p.ink }}>
                    Náhled registračního formuláře
                </Typography>
            </Box>

            <DynamicRegistrationForm formData={formData} previewMode />
        </Container>
    );
}
