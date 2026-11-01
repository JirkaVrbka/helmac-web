"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
    Autocomplete,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Alert,
} from "@mui/material";
import { Save, Add, Delete } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import { createNews, updateNews, NewsActionState } from "@/lib/actions/news";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";
import { getLinkTargets, type LinkTarget } from "@/lib/actions/link-targets";

const segmentedSx = {
    backgroundColor: p.surface2,
    border: `1px solid ${p.line}`,
    borderRadius: "10px",
    p: "3px",
    gap: "3px",
    "& .MuiToggleButton-root": {
        flex: 1,
        border: 0,
        borderRadius: "8px !important",
        color: p.ink2,
        textTransform: "none",
        transition: "all 140ms ease",
        "&:hover": {
            backgroundColor: p.indigoSoft,
            color: p.indigo,
        },
        "&.Mui-selected": {
            backgroundColor: p.indigo,
            color: "#fff",
            "&:hover": { backgroundColor: p.indigo },
        },
    },
};

type ButtonVariant = "contained" | "outlined" | "text";

interface ActionButton {
    label: string;
    url: string;
    variant?: ButtonVariant;
}

interface NewsFormProps {
    mode: "create" | "edit";
    years: { id: string; year: number; title: string }[];
    newsId?: string;
    defaultValues?: {
        yearId?: string;
        title?: string;
        content?: string;
        actionButtons?: ActionButton[];
    };
    cancelHref?: string;
    redirectTo?: string;
    hideYearSelect?: boolean;
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
                  ? "Vytvořit novinku"
                  : "Uložit změny"}
        </Button>
    );
}

export function NewsForm({
    mode,
    years,
    newsId,
    defaultValues,
    cancelHref = "/admin/novinky",
    redirectTo,
    hideYearSelect,
}: NewsFormProps) {
    const selectedYearId = defaultValues?.yearId || years[0]?.id || "";
    const [content, setContent] = useState(defaultValues?.content || "");
    const [actionButtons, setActionButtons] = useState<ActionButton[]>(
        defaultValues?.actionButtons || []
    );

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [btnLabel, setBtnLabel] = useState("");
    const [btnUrl, setBtnUrl] = useState("");
    const [btnVariant, setBtnVariant] = useState<ButtonVariant>("contained");

    const [linkTargets, setLinkTargets] = useState<LinkTarget[] | null>(null);
    const [, startLoadTargets] = useTransition();

    useEffect(() => {
        startLoadTargets(async () => {
            const targets = await getLinkTargets(selectedYearId);
            setLinkTargets(targets);
        });
    }, [selectedYearId]);

    const openAddDialog = () => {
        setBtnLabel("");
        setBtnUrl("");
        setBtnVariant("contained");
        setEditingIndex(null);
        setDialogOpen(true);
    };

    const openEditDialog = (index: number) => {
        const btn = actionButtons[index];
        setBtnLabel(btn.label);
        setBtnUrl(btn.url);
        setBtnVariant(btn.variant || "contained");
        setEditingIndex(index);
        setDialogOpen(true);
    };

    const submitButton = () => {
        if (editingIndex !== null) {
            const updated = actionButtons.map((btn, i) =>
                i === editingIndex
                    ? { label: btnLabel, url: btnUrl, variant: btnVariant }
                    : btn
            );
            setActionButtons(updated);
        } else {
            setActionButtons([
                ...actionButtons,
                { label: btnLabel, url: btnUrl, variant: btnVariant },
            ]);
        }
        setDialogOpen(false);
    };

    const deleteButton = (index: number) => {
        setActionButtons(actionButtons.filter((_, i) => i !== index));
    };

    const action =
        mode === "create"
            ? async (prevState: NewsActionState, formData: FormData) => {
                  const yearId = formData.get("yearId") as string;
                  return createNews(yearId, prevState, formData);
              }
            : updateNews.bind(null, newsId as string);

    const [state, formAction] = useActionState<NewsActionState, FormData>(
        action,
        null
    );

    return (
        <Box component="form" action={formAction}>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    mb: 2,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        width: 360,
                    }}
                >
                    <TextField
                        required
                        size="small"
                        id="title"
                        name="title"
                        label="Název novinky"
                        defaultValue={defaultValues?.title || ""}
                        error={!!state?.error?.title}
                        helperText={state?.error?.title?.[0]}
                        sx={builderFieldSx}
                    />
                    {mode === "create" && !hideYearSelect && (
                        <TextField
                            select
                            required
                            size="small"
                            id="yearId"
                            name="yearId"
                            label="Ročník"
                            defaultValue={selectedYearId}
                            sx={builderFieldSx}
                        >
                            {years.map((year) => (
                                <MenuItem key={year.id} value={year.id}>
                                    {year.year} - {year.title}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </Box>
                <Box sx={{ flex: 1 }} />
                <Box
                    sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "flex-start",
                    }}
                >
                    <LinkButton
                        href={cancelHref}
                        variant="outlined"
                        sx={{
                            borderRadius: "10px",
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
                    <SubmitButton mode={mode} />
                </Box>
            </Box>

            {mode === "create" && hideYearSelect && (
                <input type="hidden" name="yearId" value={selectedYearId} />
            )}

            {redirectTo && (
                <input type="hidden" name="redirectTo" value={redirectTo} />
            )}

            {state?.error?._form && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {state.error._form[0]}
                </Alert>
            )}
            {state?.error?.content && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {state.error.content[0]}
                </Alert>
            )}

            <input type="hidden" name="content" value={content} />
            <input
                type="hidden"
                name="actionButtons"
                value={JSON.stringify(actionButtons)}
            />

            <RichTextEditor
                value={content}
                onChange={setContent}
                minHeight={200}
                yearId={selectedYearId}
            />

            {/* Button list — card-style inline preview */}
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                    alignItems: "center",
                    mt: 2,
                }}
            >
                {actionButtons.map((btn, i) => {
                    const variant = btn.variant || "contained";
                    const variantSx =
                        variant === "contained"
                            ? {
                                  backgroundColor: p.indigo,
                                  color: "#fff",
                                  "&:hover": { backgroundColor: "#4338ca" },
                              }
                            : variant === "outlined"
                              ? {
                                    color: p.ink2,
                                    borderColor: p.line,
                                    "&:hover": {
                                        borderColor: p.ink3,
                                        backgroundColor: p.surface2,
                                    },
                                }
                              : {
                                    color: p.indigo,
                                    "&:hover": {
                                        backgroundColor: p.indigoSoft,
                                    },
                                };
                    return (
                        <Button
                            key={i}
                            variant={variant}
                            disableElevation
                            onClick={() => openEditDialog(i)}
                            endIcon={
                                <Delete
                                    sx={{
                                        fontSize: "14px !important",
                                        opacity: 0,
                                        transition: "opacity 0.15s",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteButton(i);
                                    }}
                                />
                            }
                            sx={{
                                textTransform: "none",
                                borderRadius: "10px",
                                ...variantSx,
                                "&:hover .MuiButton-endIcon svg": {
                                    opacity: 1,
                                },
                            }}
                        >
                            {btn.label || "(bez textu)"}
                        </Button>
                    );
                })}
                {actionButtons.length === 0 ? (
                    <ButtonBase
                        onClick={openAddDialog}
                        sx={{
                            py: "8px",
                            px: "14px",
                            backgroundColor: p.surface,
                            border: `1px dashed ${p.line}`,
                            borderRadius: "10px",
                            color: p.indigo,
                            fontSize: 13,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 140ms ease",
                            "&:hover": {
                                borderColor: p.indigo,
                                backgroundColor: p.indigoSoft,
                            },
                        }}
                    >
                        <Add sx={{ fontSize: 16 }} />
                        Přidat tlačítko
                    </ButtonBase>
                ) : (
                    <IconButton
                        size="small"
                        onClick={openAddDialog}
                        sx={{
                            color: p.indigo,
                            borderRadius: "8px",
                            "&:hover": { backgroundColor: p.indigoSoft },
                        }}
                    >
                        <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                )}
            </Box>

            {/* Button dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editingIndex !== null
                        ? "Upravit tlačítko"
                        : "Přidat tlačítko"}
                </DialogTitle>
                <DialogContent
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        pt: "8px !important",
                    }}
                >
                    <TextField
                        autoFocus
                        label="Text tlačítka"
                        value={btnLabel}
                        onChange={(e) => setBtnLabel(e.target.value)}
                        fullWidth
                        size="small"
                        sx={builderFieldSx}
                    />
                    <TextField
                        label="Odkaz (URL)"
                        value={btnUrl}
                        onChange={(e) => setBtnUrl(e.target.value)}
                        fullWidth
                        size="small"
                        sx={builderFieldSx}
                    />
                    <Autocomplete<LinkTarget>
                        options={linkTargets ?? []}
                        groupBy={(option) => option.group}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) =>
                            option.url === value.url
                        }
                        value={null}
                        onChange={(_, value) => {
                            if (value) {
                                setBtnUrl(value.url);
                                if (!btnLabel) {
                                    setBtnLabel(value.label);
                                }
                            }
                        }}
                        blurOnSelect
                        size="small"
                        sx={builderFieldSx}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Vybrat stránku webu"
                                placeholder="Vyhledat stránku"
                                variant="outlined"
                            />
                        )}
                    />
                    <ToggleButtonGroup
                        exclusive
                        value={btnVariant}
                        onChange={(_, v) => {
                            if (v) setBtnVariant(v);
                        }}
                        size="small"
                        fullWidth
                        sx={segmentedSx}
                    >
                        <ToggleButton value="contained">Vyplněné</ToggleButton>
                        <ToggleButton value="outlined">Obrysové</ToggleButton>
                        <ToggleButton value="text">Textové</ToggleButton>
                    </ToggleButtonGroup>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => setDialogOpen(false)}
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
                        onClick={submitButton}
                        variant="contained"
                        disableElevation
                        disabled={!btnLabel.trim()}
                        sx={{
                            borderRadius: "10px",
                            backgroundColor: p.indigo,
                            "&:hover": { backgroundColor: "#4338ca" },
                        }}
                    >
                        {editingIndex !== null ? "Uložit" : "Přidat"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
