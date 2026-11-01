"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Autocomplete,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { Save, Add, Delete } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import { LinkButton } from "@/components/ui/link-button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { getLinkTargets, type LinkTarget } from "@/lib/actions/link-targets";
import {
    createProgramEvent,
    updateProgramEvent,
    ProgramEventActionState,
} from "@/lib/actions/program-events";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

type ButtonVariant = "contained" | "outlined" | "text";

interface ActionButton {
    label: string;
    url: string;
    variant?: ButtonVariant;
}

interface ProgramEventFormProps {
    mode: "create" | "edit";
    yearId: string;
    dayId: string;
    eventId?: string;
    existingTags?: string[];
    defaultValues?: {
        startTime?: string;
        endTime?: string | null;
        title?: string;
        description?: string;
        location?: string;
        imageUrl?: string | null;
        tags?: string[];
        actionButtons?: ActionButton[];
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
                  ? "Vytvořit událost"
                  : "Uložit změny"}
        </Button>
    );
}

export function ProgramEventForm({
    mode,
    yearId,
    dayId,
    eventId,
    existingTags = [],
    defaultValues,
}: ProgramEventFormProps) {
    const [description, setDescription] = useState(
        defaultValues?.description || ""
    );
    const [selectedTags, setSelectedTags] = useState<string[]>(
        defaultValues?.tags || []
    );
    const [timeValue, setTimeValue] = useState<Dayjs | null>(
        defaultValues?.startTime
            ? dayjs(defaultValues.startTime, "HH:mm")
            : null
    );
    const [endTimeValue, setEndTimeValue] = useState<Dayjs | null>(
        defaultValues?.endTime ? dayjs(defaultValues.endTime, "HH:mm") : null
    );

    // Action buttons state
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
            const targets = await getLinkTargets(yearId);
            setLinkTargets(targets);
        });
    }, [yearId]);

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
                    ? {
                          label: btnLabel,
                          url: btnUrl,
                          variant: btnVariant,
                      }
                    : btn
            );
            setActionButtons(updated);
        } else {
            setActionButtons([
                ...actionButtons,
                {
                    label: btnLabel,
                    url: btnUrl,
                    variant: btnVariant,
                },
            ]);
        }
        setDialogOpen(false);
    };

    const deleteButton = (index: number) => {
        setActionButtons(actionButtons.filter((_, i) => i !== index));
    };

    const action =
        mode === "create"
            ? async (
                  prevState: ProgramEventActionState,
                  formData: FormData
              ) => {
                  formData.set("yearId", yearId);
                  return createProgramEvent(dayId, prevState, formData);
              }
            : updateProgramEvent.bind(null, eventId as string);

    const [state, formAction] = useActionState<
        ProgramEventActionState,
        FormData
    >(action, null);

    return (
        <>
            <Box component="form" action={formAction}>
                {/* Header row: title + actions */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        mb: 2,
                    }}
                >
                    <TextField
                        required
                        size="small"
                        id="title"
                        name="title"
                        label="Název události"
                        defaultValue={defaultValues?.title || ""}
                        error={!!state?.error?.title}
                        helperText={state?.error?.title?.[0]}
                        inputProps={{ maxLength: 200 }}
                        sx={{ ...builderFieldSx, flex: 1 }}
                    />
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "flex-start",
                        }}
                    >
                        <LinkButton
                            href={`/admin/rocniky/${yearId}/program/${dayId}`}
                            variant="outlined"
                            sx={{
                                color: p.ink2,
                                borderRadius: "10px",
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

                {state?.error?._form && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {state.error._form[0]}
                    </Alert>
                )}

                {/* Metadata row: time, location, tags */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr 1fr",
                            md: "140px 140px 1fr 2fr",
                        },
                        gap: 2,
                        mb: 2,
                    }}
                >
                    <Box>
                        <TimePicker
                            label="Začátek"
                            value={timeValue}
                            onChange={(v) => setTimeValue(v)}
                            ampm={false}
                            format="HH:mm"
                            slotProps={{
                                textField: {
                                    required: true,
                                    fullWidth: true,
                                    size: "small",
                                    error: !!state?.error?.startTime,
                                    helperText: state?.error?.startTime?.[0],
                                    sx: builderFieldSx,
                                },
                            }}
                        />
                        <input
                            type="hidden"
                            name="startTime"
                            value={timeValue?.format("HH:mm") ?? ""}
                        />
                    </Box>

                    <Box>
                        <TimePicker
                            label="Konec"
                            value={endTimeValue}
                            onChange={(v) => setEndTimeValue(v)}
                            ampm={false}
                            format="HH:mm"
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: "small",
                                    error: !!state?.error?.endTime,
                                    helperText: state?.error?.endTime?.[0],
                                    sx: builderFieldSx,
                                },
                                field: {
                                    clearable: true,
                                    onClear: () => setEndTimeValue(null),
                                },
                            }}
                        />
                        <input
                            type="hidden"
                            name="endTime"
                            value={endTimeValue?.format("HH:mm") ?? ""}
                        />
                    </Box>

                    <TextField
                        required
                        fullWidth
                        size="small"
                        id="location"
                        name="location"
                        label="Místo konání"
                        defaultValue={defaultValues?.location || ""}
                        error={!!state?.error?.location}
                        helperText={state?.error?.location?.[0]}
                        placeholder="Náměstí, Louka..."
                        inputProps={{ maxLength: 200 }}
                        sx={builderFieldSx}
                    />

                    <Autocomplete
                        multiple
                        freeSolo
                        id="tags"
                        size="small"
                        options={existingTags}
                        value={selectedTags}
                        onChange={(_, newValue) => {
                            setSelectedTags(newValue as string[]);
                        }}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({
                                    index,
                                });
                                return (
                                    <Chip
                                        key={key}
                                        label={option}
                                        {...tagProps}
                                        size="small"
                                        sx={{
                                            borderRadius: "7px",
                                            backgroundColor: p.indigoSoft,
                                            color: p.indigoInk,
                                            "& .MuiChip-deleteIcon": {
                                                color: p.indigoInk,
                                            },
                                        }}
                                    />
                                );
                            })
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Tagy"
                                placeholder="Tagy..."
                                error={!!state?.error?.tags}
                                helperText={state?.error?.tags?.[0]}
                                sx={builderFieldSx}
                            />
                        )}
                    />
                    <input
                        type="hidden"
                        name="tags"
                        value={JSON.stringify(selectedTags)}
                    />
                </Box>

                {/* Description */}
                {state?.error?.description && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                        {state.error.description[0]}
                    </Alert>
                )}
                <input type="hidden" name="description" value={description} />
                <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    minHeight={120}
                    allowedTools={["basicFormatting"]}
                    placeholder="Popis události..."
                />

                {/* Action buttons editor */}
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        alignItems: "center",
                    }}
                >
                    {actionButtons.map((btn, i) => (
                        <Button
                            key={i}
                            variant={btn.variant || "contained"}
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
                                "&:hover .MuiButton-endIcon svg": {
                                    opacity: 1,
                                },
                            }}
                        >
                            {btn.label || "(bez textu)"}
                        </Button>
                    ))}
                    {actionButtons.length === 0 ? (
                        <Button
                            size="small"
                            startIcon={<Add />}
                            onClick={openAddDialog}
                            sx={{
                                backgroundColor: p.surface,
                                border: `1px dashed ${p.line}`,
                                borderRadius: "10px",
                                color: p.indigo,
                                textTransform: "none",
                                fontWeight: 600,
                                "&:hover": {
                                    borderColor: p.indigo,
                                    backgroundColor: p.indigoSoft,
                                },
                            }}
                        >
                            Přidat tlačítko
                        </Button>
                    ) : (
                        <IconButton
                            size="small"
                            onClick={openAddDialog}
                            sx={{
                                color: p.ink3,
                                borderRadius: "8px",
                                "&:hover": {
                                    color: p.indigo,
                                    backgroundColor: p.indigoSoft,
                                },
                            }}
                        >
                            <Add sx={{ fontSize: 18 }} />
                        </IconButton>
                    )}
                </Box>
                <input
                    type="hidden"
                    name="actionButtons"
                    value={JSON.stringify(actionButtons)}
                />
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
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Vybrat stránku webu"
                                placeholder="Vyhledat stránku"
                                variant="outlined"
                                sx={builderFieldSx}
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
                        sx={{
                            backgroundColor: p.surface2,
                            border: `1px solid ${p.line}`,
                            borderRadius: "10px",
                            p: "3px",
                            gap: "3px",
                            "& .MuiToggleButton-root": {
                                border: "none",
                                borderRadius: "8px !important",
                                textTransform: "none",
                                color: p.ink2,
                                "&.Mui-selected": {
                                    backgroundColor: p.indigo,
                                    color: p.surface,
                                    "&:hover": { backgroundColor: "#4338ca" },
                                },
                            },
                        }}
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
                        disabled={!btnLabel.trim()}
                        disableElevation
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
        </>
    );
}
