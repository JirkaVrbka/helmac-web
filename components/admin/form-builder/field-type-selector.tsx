"use client";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Grid,
    ButtonBase,
    Box,
} from "@mui/material";
import { FieldType, FIELD_TYPE_META } from "@/lib/types/registration-form";
import { FIELD_TYPE_ICONS } from "./field-type-icons";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const categoryLabelSx = {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: p.ink3,
    fontWeight: 600,
    mb: 1,
} as const;

interface FieldTypeSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelect: (type: FieldType) => void;
}

export function FieldTypeSelector({
    open,
    onClose,
    onSelect,
}: FieldTypeSelectorProps) {
    const inputTypes = Object.entries(FIELD_TYPE_META).filter(
        ([, meta]) => meta.group === "input"
    );
    const layoutTypes = Object.entries(FIELD_TYPE_META).filter(
        ([, meta]) => meta.group === "layout"
    );

    const handleSelect = (type: FieldType) => {
        onSelect(type);
        onClose();
    };

    const tile = (
        type: FieldType,
        label: string,
        icon: React.ReactNode,
        iconColor: string
    ) => (
        <ButtonBase
            onClick={() => handleSelect(type)}
            sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                px: "6px",
                py: "11px",
                textAlign: "center",
                border: `1px solid ${p.line}`,
                borderRadius: "10px",
                backgroundColor: p.surface,
                color: p.ink2,
                transition: "all 140ms ease",
                "&:hover": {
                    borderColor: p.indigo,
                    backgroundColor: p.indigoSoft,
                },
            }}
        >
            <Box sx={{ color: iconColor, display: "flex" }}>{icon}</Box>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                {label}
            </Typography>
        </ButtonBase>
    );

    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: "14px" } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Přidat pole</DialogTitle>
            <DialogContent>
                <Typography sx={categoryLabelSx}>Vstupní pole</Typography>
                <Grid container spacing={1} sx={{ mb: 3 }}>
                    {inputTypes.map(([type, meta]) => (
                        <Grid item xs={6} sm={4} key={type}>
                            {tile(
                                type as FieldType,
                                meta.label,
                                FIELD_TYPE_ICONS[meta.icon],
                                p.indigo
                            )}
                        </Grid>
                    ))}
                </Grid>

                <Typography sx={categoryLabelSx}>Rozložení</Typography>
                <Grid container spacing={1}>
                    {layoutTypes.map(([type, meta]) => (
                        <Grid item xs={6} sm={4} key={type}>
                            {tile(
                                type as FieldType,
                                meta.label,
                                FIELD_TYPE_ICONS[meta.icon],
                                p.ink3
                            )}
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
        </Dialog>
    );
}
