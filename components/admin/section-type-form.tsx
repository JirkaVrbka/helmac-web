"use client";

import { useState, useActionState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    FormControlLabel,
    Switch,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { IconPicker } from "@/components/admin/icon-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
    createSectionType,
    updateSectionType,
    SectionTypeActionState,
} from "@/lib/actions/sections";
import { useRouter } from "next/navigation";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

interface SectionTypeFormProps {
    mode: "create" | "edit";
    yearId: string;
    typeId?: string;
    defaultValues?: {
        label?: string;
        slug?: string;
        icon?: string | null;
        pageTitle?: string | null;
        pageSubtitle?: string | null;
        metaTitle?: string | null;
        metaDescription?: string | null;
        featuredOnIndex?: boolean;
        description?: string | null;
    };
    open: boolean;
    onClose: () => void;
}

export function SectionTypeForm({
    mode,
    yearId,
    typeId,
    defaultValues,
    open,
    onClose,
}: SectionTypeFormProps) {
    const router = useRouter();
    const [slugManual, setSlugManual] = useState(mode === "edit");
    const [slug, setSlug] = useState(defaultValues?.slug || "");
    const [icon, setIcon] = useState<string | null>(
        defaultValues?.icon || null
    );
    const [featuredOnIndex, setFeaturedOnIndex] = useState(
        defaultValues?.featuredOnIndex ?? false
    );
    const [description, setDescription] = useState(
        defaultValues?.description || ""
    );

    const serverAction =
        mode === "create"
            ? createSectionType.bind(null, yearId)
            : updateSectionType.bind(null, typeId as string);

    const [state, formAction, isPending] = useActionState<
        SectionTypeActionState,
        FormData
    >(async (prev, formData) => {
        const result = await serverAction(prev, formData);
        if (result?.success) {
            onClose();
            router.refresh();
        }
        return result;
    }, null);

    const handleLabelChange = (value: string) => {
        if (!slugManual) {
            setSlug(slugify(value));
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: "14px" } }}
        >
            <Box component="form" action={formAction}>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {mode === "create" ? "Nový typ sekce" : "Upravit typ sekce"}
                </DialogTitle>
                <DialogContent>
                    {state?.error?._form && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {state.error._form[0]}
                        </Alert>
                    )}

                    <input type="hidden" name="icon" value={icon || ""} />
                    <input
                        type="hidden"
                        name="featuredOnIndex"
                        value={String(featuredOnIndex)}
                    />
                    <input
                        type="hidden"
                        name="description"
                        value={description}
                    />
                    <Box
                        sx={{
                            display: "flex",
                            gap: 3,
                            alignItems: "flex-start",
                        }}
                    >
                        <IconPicker value={icon} onChange={setIcon} />
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                autoFocus
                                required
                                fullWidth
                                margin="dense"
                                name="label"
                                label="Název"
                                defaultValue={defaultValues?.label || ""}
                                error={!!state?.error?.label}
                                helperText={state?.error?.label?.[0]}
                                onChange={(e) =>
                                    handleLabelChange(e.target.value)
                                }
                                sx={builderFieldSx}
                            />
                            <TextField
                                required
                                fullWidth
                                margin="dense"
                                name="slug"
                                label="Slug (URL)"
                                value={slug}
                                onChange={(e) => {
                                    setSlug(e.target.value);
                                    setSlugManual(true);
                                }}
                                error={!!state?.error?.slug}
                                helperText={
                                    state?.error?.slug?.[0] ||
                                    `Veřejná stránka bude na /${slug}`
                                }
                                sx={builderFieldSx}
                            />
                        </Box>
                    </Box>

                    <Accordion
                        disableGutters
                        elevation={0}
                        sx={{ mt: 2, "&:before": { display: "none" } }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ color: p.ink3 }} />}
                        >
                            <Typography
                                variant="body2"
                                sx={{ color: p.ink2, fontWeight: 600 }}
                            >
                                Nastavení veřejné stránky
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                            }}
                        >
                            <TextField
                                fullWidth
                                size="small"
                                name="pageTitle"
                                label="Titulek stránky"
                                defaultValue={defaultValues?.pageTitle || ""}
                                sx={builderFieldSx}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                name="pageSubtitle"
                                label="Podtitulek stránky"
                                defaultValue={defaultValues?.pageSubtitle || ""}
                                sx={builderFieldSx}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                name="metaTitle"
                                label="Meta titulek"
                                defaultValue={defaultValues?.metaTitle || ""}
                                helperText="Pro SEO, např. 'Info | Helmáč'"
                                sx={builderFieldSx}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                name="metaDescription"
                                label="Meta popis"
                                defaultValue={
                                    defaultValues?.metaDescription || ""
                                }
                                multiline
                                rows={2}
                                sx={builderFieldSx}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={featuredOnIndex}
                                        onChange={(e) =>
                                            setFeaturedOnIndex(e.target.checked)
                                        }
                                        sx={{
                                            "& .MuiSwitch-switchBase.Mui-checked":
                                                { color: p.indigo },
                                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                { backgroundColor: p.indigo },
                                        }}
                                    />
                                }
                                label="Zobrazit na úvodní stránce"
                                sx={{ mt: 1 }}
                            />
                            <Typography
                                variant="caption"
                                sx={{ ml: 4, color: p.ink3 }}
                            >
                                Pouze jeden typ sekcí může být zobrazený na
                                úvodní stránce.
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ mb: 0.5, color: p.ink2 }}
                                >
                                    Popis pro úvodní stránku
                                </Typography>
                                <RichTextEditor
                                    value={description}
                                    onChange={setDescription}
                                    format="markdown"
                                    minHeight={60}
                                    allowedTools={["basicFormatting"]}
                                    placeholder="Krátký popis zobrazený na úvodní stránce…"
                                />
                                <Typography
                                    variant="caption"
                                    sx={{ color: p.ink3 }}
                                >
                                    Zobrazí se jako podtitulek sekce na úvodní
                                    stránce.
                                </Typography>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={onClose}
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
                        type="submit"
                        variant="contained"
                        disabled={isPending}
                        disableElevation
                        sx={{
                            borderRadius: "10px",
                            backgroundColor: p.indigo,
                            "&:hover": { backgroundColor: "#4338ca" },
                        }}
                        startIcon={
                            isPending ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : null
                        }
                    >
                        {isPending
                            ? "Ukládám..."
                            : mode === "create"
                              ? "Vytvořit"
                              : "Uložit"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
