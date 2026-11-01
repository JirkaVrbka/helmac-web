"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Save } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import { LinkButton } from "@/components/ui/link-button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createYear, updateYear, YearActionState } from "@/lib/actions/years";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

// Photo-field label / hint (admin design system).
const photoLabelSx = {
    fontSize: 12,
    fontWeight: 600,
    color: p.ink2,
    display: "block",
    mb: 0.5,
};

const photoHintSx = {
    fontSize: 12,
    color: p.ink3,
    display: "block",
    mb: 1,
};

// Ghost (secondary / cancel) button (admin design system).
const ghostButtonSx = {
    textTransform: "none" as const,
    fontWeight: 600,
    borderRadius: "10px",
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    "&:hover": {
        borderColor: p.ink3,
        backgroundColor: p.surface2,
    },
};

interface YearFormProps {
    mode: "create" | "edit";
    yearId?: string;
    defaultValues?: {
        year?: number;
        title?: string;
        subtitle?: string | null;
        startDate?: Date | null;
        endDate?: Date | null;
        headerPhoto?: string | null;
        heroPhoto?: string | null;
    };
    onCancel?: () => void;
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="contained"
            disabled={pending}
            disableElevation
            sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "10px",
                backgroundColor: p.indigo,
                "&:hover": { backgroundColor: "#4338ca" },
            }}
            startIcon={
                pending ? (
                    <CircularProgress size={20} color="inherit" />
                ) : (
                    <Save />
                )
            }
        >
            {pending
                ? "Ukládám..."
                : mode === "create"
                  ? "Vytvořit ročník"
                  : "Uložit změny"}
        </Button>
    );
}

export function YearForm({
    mode,
    yearId,
    defaultValues,
    onCancel,
}: YearFormProps) {
    const action =
        mode === "create"
            ? createYear
            : updateYear.bind(null, yearId as string);

    const [state, formAction] = useActionState<YearActionState, FormData>(
        action,
        null
    );

    const [startDate, setStartDate] = useState<Dayjs | null>(
        defaultValues?.startDate ? dayjs(defaultValues.startDate) : null
    );
    const [endDate, setEndDate] = useState<Dayjs | null>(
        defaultValues?.endDate ? dayjs(defaultValues.endDate) : null
    );
    const [headerPhoto, setHeaderPhoto] = useState(
        defaultValues?.headerPhoto || ""
    );
    const [heroPhoto, setHeroPhoto] = useState(defaultValues?.heroPhoto || "");

    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            <Box component="form" action={formAction}>
                <Box
                    sx={{
                        p: 2.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                    }}
                >
                    {state?.error?._form && (
                        <Alert severity="error">{state.error._form[0]}</Alert>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                            },
                            gap: 3,
                        }}
                    >
                        <TextField
                            required
                            fullWidth
                            size="small"
                            id="year"
                            name="year"
                            label="Rok"
                            type="number"
                            defaultValue={defaultValues?.year || ""}
                            error={!!state?.error?.year}
                            helperText={state?.error?.year?.[0]}
                            inputProps={{ min: 2000, max: 2100 }}
                            sx={builderFieldSx}
                        />

                        <TextField
                            required
                            fullWidth
                            size="small"
                            id="title"
                            name="title"
                            label="Název ročníku"
                            defaultValue={defaultValues?.title || ""}
                            error={!!state?.error?.title}
                            helperText={state?.error?.title?.[0]}
                            placeholder="např. Helmáč 2025"
                            sx={builderFieldSx}
                        />
                    </Box>

                    <TextField
                        fullWidth
                        size="small"
                        id="subtitle"
                        name="subtitle"
                        label="Podtitulek"
                        defaultValue={defaultValues?.subtitle || ""}
                        error={!!state?.error?.subtitle}
                        helperText={state?.error?.subtitle?.[0]}
                        placeholder="např. Téma ročníku nebo popis"
                        sx={builderFieldSx}
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                            },
                            gap: 3,
                        }}
                    >
                        <Box>
                            <DatePicker
                                label="Datum začátku"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                format="DD.MM.YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small",
                                        error: !!state?.error?.startDate,
                                        helperText:
                                            state?.error?.startDate?.[0],
                                        sx: builderFieldSx,
                                    },
                                }}
                            />
                            <input
                                type="hidden"
                                name="startDate"
                                value={startDate?.format("YYYY-MM-DD") ?? ""}
                            />
                        </Box>

                        <Box>
                            <DatePicker
                                label="Datum konce"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                format="DD.MM.YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small",
                                        error: !!state?.error?.endDate,
                                        helperText: state?.error?.endDate?.[0],
                                        sx: builderFieldSx,
                                    },
                                }}
                            />
                            <input
                                type="hidden"
                                name="endDate"
                                value={endDate?.format("YYYY-MM-DD") ?? ""}
                            />
                        </Box>
                    </Box>

                    <Box>
                        <Typography sx={photoLabelSx}>
                            Foto záhlaví podstránek
                        </Typography>
                        <Typography sx={photoHintSx}>
                            Obrázek na pozadí záhlaví veřejných podstránek
                            (Program, Pravidla, Galerie, apod.)
                        </Typography>
                        <ImageUploader
                            value={headerPhoto}
                            onChange={setHeaderPhoto}
                        />
                        <input
                            type="hidden"
                            name="headerPhoto"
                            value={headerPhoto}
                        />
                        {state?.error?.headerPhoto && (
                            <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5 }}
                            >
                                {state.error.headerPhoto[0]}
                            </Typography>
                        )}
                    </Box>

                    <Box>
                        <Typography sx={photoLabelSx}>
                            Foto hlavní sekce
                        </Typography>
                        <Typography sx={photoHintSx}>
                            Obrázek na pozadí úvodní sekce domovské stránky
                        </Typography>
                        <ImageUploader
                            value={heroPhoto}
                            onChange={setHeroPhoto}
                        />
                        <input
                            type="hidden"
                            name="heroPhoto"
                            value={heroPhoto}
                        />
                        {state?.error?.heroPhoto && (
                            <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5 }}
                            >
                                {state.error.heroPhoto[0]}
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box
                    sx={{
                        px: 2.5,
                        pb: 2.5,
                        display: "flex",
                        gap: 1.5,
                    }}
                >
                    <SubmitButton mode={mode} />
                    {onCancel ? (
                        <Button onClick={onCancel} sx={ghostButtonSx}>
                            Zrušit
                        </Button>
                    ) : (
                        <LinkButton href="/admin/rocniky" sx={ghostButtonSx}>
                            Zrušit
                        </LinkButton>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
