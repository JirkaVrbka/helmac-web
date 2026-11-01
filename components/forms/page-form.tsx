"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
} from "@mui/material";
import { Save, ExpandMore } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import { createPage, updatePage, PageActionState } from "@/lib/actions/pages";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface PageFormProps {
    mode: "create" | "edit";
    yearId: string;
    pageId?: string;
    defaultValues?: {
        slug?: string;
        title?: string;
        seoTitle?: string | null;
        seoDesc?: string | null;
        sortOrder?: number;
    };
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
                borderRadius: "10px",
                textTransform: "none",
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
                  ? "Vytvořit stránku"
                  : "Uložit změny"}
        </Button>
    );
}

export function PageForm({
    mode,
    yearId,
    pageId,
    defaultValues,
}: PageFormProps) {
    const action =
        mode === "create"
            ? createPage.bind(null, yearId)
            : updatePage.bind(null, pageId as string);

    const [state, formAction] = useActionState<PageActionState, FormData>(
        action,
        null
    );

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
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        p: 2.5,
                    }}
                >
                    {state?.error?._form && (
                        <Alert severity="error">{state.error._form[0]}</Alert>
                    )}

                    {state?.success && (
                        <Alert severity="success">Změny byly uloženy.</Alert>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "1fr 1fr",
                            },
                            gap: 3,
                        }}
                    >
                        <TextField
                            required
                            fullWidth
                            size="small"
                            id="title"
                            name="title"
                            label="Název stránky"
                            defaultValue={defaultValues?.title || ""}
                            error={!!state?.error?.title}
                            helperText={state?.error?.title?.[0]}
                            sx={builderFieldSx}
                        />

                        <TextField
                            required
                            fullWidth
                            size="small"
                            id="slug"
                            name="slug"
                            label="URL slug"
                            defaultValue={defaultValues?.slug || ""}
                            error={!!state?.error?.slug}
                            helperText={
                                state?.error?.slug?.[0] ||
                                "Pouze malá písmena, čísla a pomlčky"
                            }
                            placeholder="např. o-akci"
                            sx={builderFieldSx}
                        />
                    </Box>

                    <Accordion
                        disableGutters
                        elevation={0}
                        sx={{
                            backgroundColor: p.surface2,
                            border: `1px solid ${p.line}`,
                            borderRadius: "10px",
                            "&:before": { display: "none" },
                            "&.Mui-expanded": { margin: 0 },
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ color: p.ink3 }} />}
                        >
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    letterSpacing: "0.14em",
                                    textTransform: "uppercase",
                                    fontWeight: 700,
                                    color: p.ink3,
                                }}
                            >
                                SEO nastavení
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    fullWidth
                                    size="small"
                                    id="seoTitle"
                                    name="seoTitle"
                                    label="SEO titulek"
                                    defaultValue={defaultValues?.seoTitle || ""}
                                    error={!!state?.error?.seoTitle}
                                    helperText={
                                        state?.error?.seoTitle?.[0] ||
                                        "Max 70 znaků"
                                    }
                                    inputProps={{ maxLength: 70 }}
                                    sx={builderFieldSx}
                                />

                                <TextField
                                    fullWidth
                                    size="small"
                                    id="seoDesc"
                                    name="seoDesc"
                                    label="SEO popis"
                                    defaultValue={defaultValues?.seoDesc || ""}
                                    error={!!state?.error?.seoDesc}
                                    helperText={
                                        state?.error?.seoDesc?.[0] ||
                                        "Max 160 znaků"
                                    }
                                    multiline
                                    rows={2}
                                    inputProps={{ maxLength: 160 }}
                                    sx={builderFieldSx}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <input
                        type="hidden"
                        name="sortOrder"
                        value={defaultValues?.sortOrder ?? 0}
                    />
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        gap: 1.25,
                        px: 2.5,
                        pb: 2.5,
                    }}
                >
                    <SubmitButton mode={mode} />
                    <LinkButton
                        href={`/admin/rocniky/${yearId}`}
                        variant="outlined"
                        sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            color: p.ink2,
                            borderColor: p.line,
                            "&:hover": {
                                borderColor: p.ink3,
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        Zrušit
                    </LinkButton>
                </Box>
            </Box>
        </Box>
    );
}
