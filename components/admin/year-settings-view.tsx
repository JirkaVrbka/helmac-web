"use client";

import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Edit } from "@mui/icons-material";
import { YearForm } from "@/components/forms/year-form";
import { formatDate } from "@/lib/utils/date";
import { storageUrl } from "@/lib/utils/storage";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

// Field label in the read-only view (admin design system).
const labelSx = {
    fontSize: 12,
    fontWeight: 600,
    color: p.ink2,
};

const valueSx = {
    fontSize: "0.95rem",
    color: p.ink,
};

interface YearSettingsViewProps {
    yearId: string;
    defaultValues: {
        year?: number;
        title?: string;
        subtitle?: string | null;
        startDate?: Date | null;
        endDate?: Date | null;
        headerPhoto?: string | null;
        heroPhoto?: string | null;
    };
}

export function YearSettingsView({
    yearId,
    defaultValues,
}: YearSettingsViewProps) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <YearForm
                mode="edit"
                yearId={yearId}
                defaultValues={defaultValues}
                onCancel={() => setEditing(false)}
            />
        );
    }

    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography sx={labelSx}>Rok</Typography>
                        <Typography sx={valueSx}>
                            {defaultValues.year ?? "—"}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={labelSx}>Název</Typography>
                        <Typography sx={valueSx}>
                            {defaultValues.title ?? "—"}
                        </Typography>
                    </Box>
                </Box>

                <Box>
                    <Typography sx={labelSx}>Podtitulek</Typography>
                    <Typography sx={valueSx}>
                        {defaultValues.subtitle || "—"}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography sx={labelSx}>Datum začátku</Typography>
                        <Typography sx={valueSx}>
                            {formatDate(defaultValues.startDate)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={labelSx}>Datum konce</Typography>
                        <Typography sx={valueSx}>
                            {formatDate(defaultValues.endDate)}
                        </Typography>
                    </Box>
                </Box>

                <Box>
                    <Typography sx={labelSx}>
                        Foto záhlaví podstránek
                    </Typography>
                    {defaultValues.headerPhoto ? (
                        <Box
                            component="img"
                            src={storageUrl(defaultValues.headerPhoto)}
                            alt="Foto záhlaví podstránek"
                            sx={{
                                display: "block",
                                mt: 0.5,
                                height: 120,
                                objectFit: "cover",
                                borderRadius: "10px",
                            }}
                        />
                    ) : (
                        <Typography sx={valueSx}>Nenastaveno</Typography>
                    )}
                </Box>

                <Box>
                    <Typography sx={labelSx}>Foto hlavní sekce</Typography>
                    {defaultValues.heroPhoto ? (
                        <Box
                            component="img"
                            src={storageUrl(defaultValues.heroPhoto)}
                            alt="Foto hlavní sekce"
                            sx={{
                                display: "block",
                                mt: 0.5,
                                height: 120,
                                objectFit: "cover",
                                borderRadius: "10px",
                            }}
                        />
                    ) : (
                        <Typography sx={valueSx}>Nenastaveno</Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ px: 2.5, pb: 2.5 }}>
                <Button
                    variant="contained"
                    disableElevation
                    startIcon={<Edit />}
                    onClick={() => setEditing(true)}
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        backgroundColor: p.indigo,
                        "&:hover": { backgroundColor: "#4338ca" },
                    }}
                >
                    Upravit
                </Button>
            </Box>
        </Box>
    );
}
