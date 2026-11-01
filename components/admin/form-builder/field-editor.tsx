"use client";

import { useState, useCallback, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Box,
    Typography,
    IconButton,
    Chip,
    Tooltip,
    CircularProgress,
} from "@mui/material";
import { Add, Delete, Image as ImageIcon } from "@mui/icons-material";
import type {
    FormField,
    FormCondition,
    InputField,
    HeadingField,
    DescriptionField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { isInputField, FIELD_TYPE_META } from "@/lib/types/registration-form";
import { getConditionsUsingOptionValue } from "@/lib/utils/condition-validation";
import { formatPrice } from "@/lib/utils/pricing";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { storageUrl } from "@/lib/utils/storage";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const indigoSwitchSx = {
    "& .MuiSwitch-switchBase": { color: "#fff" },
    "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: p.indigo,
        opacity: 1,
    },
    "& .MuiSwitch-track": { backgroundColor: p.surface3, opacity: 1 },
} as const;

const switchLabelSx = {
    "& .MuiFormControlLabel-label": {
        fontSize: "0.875rem",
        color: p.ink2,
    },
} as const;

const ghostButtonSx = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
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
    "&:hover": {
        backgroundColor: "#4338ca",
        boxShadow: "none",
    },
} as const;

const dashedButtonSx = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    backgroundColor: p.surface,
    border: `1px dashed ${p.line}`,
    color: p.indigo,
    "&:hover": {
        borderColor: p.indigo,
        backgroundColor: p.indigoSoft,
    },
} as const;

interface FieldEditorProps {
    open: boolean;
    field: FormField | null;
    onClose: () => void;
    onSave: (field: FormField) => void;
    conditions?: FormCondition[];
    pricingDefinitions?: PricingDefinition[];
    priceTiers?: string[];
}

export function FieldEditor({
    open,
    field,
    onClose,
    onSave,
    conditions,
    pricingDefinitions,
    priceTiers,
}: FieldEditorProps) {
    if (!field) return null;

    return (
        <FieldEditorInner
            key={field.id}
            open={open}
            field={field}
            onClose={onClose}
            onSave={onSave}
            conditions={conditions}
            pricingDefinitions={pricingDefinitions}
            priceTiers={priceTiers}
        />
    );
}

function FieldEditorInner({
    open,
    field,
    onClose,
    onSave,
    conditions,
    pricingDefinitions,
    priceTiers,
}: Omit<FieldEditorProps, "field"> & { field: FormField }) {
    const [editData, setEditData] = useState<FormField>(() =>
        structuredClone(field)
    );

    const isInput = isInputField(editData);
    const needsOptions =
        isInput && (editData.type === "select" || editData.type === "radio");
    const isPricingSelect = isInput && editData.type === "pricing_select";
    const isPricingQuantity = isInput && editData.type === "pricing_quantity";
    const isPricingMultiSelect =
        isInput && editData.type === "pricing_multi_select";
    const isPricing =
        isPricingSelect || isPricingQuantity || isPricingMultiSelect;
    const isOptionsBasedPricing = isPricingSelect || isPricingMultiSelect;

    const handleSave = () => {
        if (!editData) return;
        onSave(editData);
    };

    const updateInput = (updates: Partial<InputField>) => {
        setEditData((prev) =>
            prev ? ({ ...prev, ...updates } as FormField) : prev
        );
    };

    const updateLayout = (updates: { text?: string }) => {
        setEditData((prev) =>
            prev ? ({ ...prev, ...updates } as FormField) : prev
        );
    };

    const inputData = editData as InputField;
    const layoutData = editData as HeadingField | DescriptionField;

    return (
        <Dialog
            open={open}
            maxWidth={editData.type === "description" ? "md" : "sm"}
            fullWidth
            PaperProps={{ sx: { borderRadius: "14px" } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                Upravit pole — {FIELD_TYPE_META[editData.type].label}
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        mt: 1,
                    }}
                >
                    {isInput ? (
                        <>
                            <TextField
                                label="Popisek (label)"
                                value={inputData.label}
                                onChange={(e) =>
                                    updateInput({ label: e.target.value })
                                }
                                fullWidth
                                required
                                size="small"
                                sx={builderFieldSx}
                            />
                            {!isPricing && (
                                <TextField
                                    label="Placeholder"
                                    value={inputData.placeholder || ""}
                                    onChange={(e) =>
                                        updateInput({
                                            placeholder:
                                                e.target.value || undefined,
                                        })
                                    }
                                    fullWidth
                                    size="small"
                                    sx={builderFieldSx}
                                />
                            )}
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={inputData.required}
                                        onChange={(e) =>
                                            updateInput({
                                                required: e.target.checked,
                                            })
                                        }
                                        sx={indigoSwitchSx}
                                    />
                                }
                                label="Povinné pole"
                                sx={switchLabelSx}
                            />
                            {!isPricing && (
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={
                                                    inputData.editable ?? false
                                                }
                                                onChange={(e) =>
                                                    updateInput({
                                                        editable:
                                                            e.target.checked ||
                                                            undefined,
                                                    })
                                                }
                                                sx={indigoSwitchSx}
                                            />
                                        }
                                        label="Upravitelné po odeslání"
                                        sx={switchLabelSx}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            ml: 4,
                                            mt: -0.5,
                                            color: p.ink3,
                                        }}
                                    >
                                        Uživatel může pole upravit po odeslání
                                        registrace
                                    </Typography>
                                </Box>
                            )}
                            <Box>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={
                                                inputData.includeForAdditionalPeople ??
                                                false
                                            }
                                            onChange={(e) =>
                                                updateInput({
                                                    includeForAdditionalPeople:
                                                        e.target.checked ||
                                                        undefined,
                                                })
                                            }
                                            sx={indigoSwitchSx}
                                        />
                                    }
                                    label="Další osoby"
                                    sx={switchLabelSx}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: "block",
                                        ml: 4,
                                        mt: -0.5,
                                        color: p.ink3,
                                    }}
                                >
                                    Pole bude zobrazeno i pro další přidané
                                    osoby
                                </Typography>
                            </Box>

                            {isOptionsBasedPricing &&
                                (() => {
                                    const def = pricingDefinitions?.find(
                                        (d) => d.id === inputData.pricingId
                                    );
                                    return (
                                        <Box
                                            sx={{
                                                p: 2,
                                                backgroundColor: p.surface2,
                                                border: `1px solid ${p.line}`,
                                                borderRadius: "10px",
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 1 }}
                                            >
                                                Cenová skupina:{" "}
                                                {def?.name || "(nenalezena)"}
                                            </Typography>
                                            {def &&
                                                (() => {
                                                    const defTiers =
                                                        def.usePriceTiers
                                                            ? (priceTiers ?? [])
                                                            : [];
                                                    return (
                                                        <>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: p.ink3,
                                                                }}
                                                            >
                                                                {
                                                                    def.options
                                                                        .length
                                                                }{" "}
                                                                {def.options
                                                                    .length ===
                                                                1
                                                                    ? "možnost"
                                                                    : "možnosti"}
                                                                {def.usePriceTiers
                                                                    ? ` · ${defTiers.length} ${defTiers.length === 1 ? "termín" : "termíny"}`
                                                                    : " · paušální cena"}
                                                            </Typography>
                                                            <Box sx={{ mt: 1 }}>
                                                                {def.options.map(
                                                                    (opt) => (
                                                                        <Typography
                                                                            key={
                                                                                opt.id
                                                                            }
                                                                            variant="body2"
                                                                            sx={{
                                                                                mb: 0.5,
                                                                            }}
                                                                        >
                                                                            {
                                                                                opt.name
                                                                            }
                                                                            {opt.description
                                                                                ? ` — ${opt.description}`
                                                                                : ""}{" "}
                                                                            (
                                                                            {defTiers
                                                                                .map(
                                                                                    (
                                                                                        _,
                                                                                        i
                                                                                    ) =>
                                                                                        formatPrice(
                                                                                            opt
                                                                                                .prices[
                                                                                                i
                                                                                            ]
                                                                                        )
                                                                                )
                                                                                .join(
                                                                                    " / "
                                                                                )}
                                                                            {defTiers.length >
                                                                            0
                                                                                ? " / "
                                                                                : ""}
                                                                            {formatPrice(
                                                                                opt
                                                                                    .prices[
                                                                                    defTiers
                                                                                        .length
                                                                                ]
                                                                            )}
                                                                            )
                                                                        </Typography>
                                                                    )
                                                                )}
                                                            </Box>
                                                        </>
                                                    );
                                                })()}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    mt: 1,
                                                    display: "block",
                                                    color: p.indigo,
                                                }}
                                            >
                                                Upravit ceny v záložce Ceník
                                            </Typography>
                                        </Box>
                                    );
                                })()}

                            {isPricingQuantity &&
                                (() => {
                                    const def = pricingDefinitions?.find(
                                        (d) => d.id === inputData.pricingId
                                    );
                                    const unitOpt = def?.options[0];
                                    return (
                                        <Box
                                            sx={{
                                                p: 2,
                                                backgroundColor: p.surface2,
                                                border: `1px solid ${p.line}`,
                                                borderRadius: "10px",
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 1 }}
                                            >
                                                Cenový počet:{" "}
                                                {def?.name || "(nenalezena)"}
                                            </Typography>
                                            {def &&
                                                (() => {
                                                    const defTiersQ =
                                                        def.usePriceTiers
                                                            ? (priceTiers ?? [])
                                                            : [];
                                                    return (
                                                        <>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: p.ink3,
                                                                }}
                                                            >
                                                                Jednotka:{" "}
                                                                {def.unitName ||
                                                                    "(nenastavena)"}
                                                                {def.usePriceTiers
                                                                    ? ` · ${defTiersQ.length} ${defTiersQ.length === 1 ? "termín" : "termíny"}`
                                                                    : " · paušální cena"}
                                                            </Typography>
                                                            {unitOpt && (
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        mt: 1,
                                                                    }}
                                                                >
                                                                    Cena za
                                                                    jednotku:{" "}
                                                                    {defTiersQ
                                                                        .map(
                                                                            (
                                                                                _,
                                                                                i
                                                                            ) =>
                                                                                formatPrice(
                                                                                    unitOpt
                                                                                        .prices[
                                                                                        i
                                                                                    ]
                                                                                )
                                                                        )
                                                                        .join(
                                                                            " / "
                                                                        )}
                                                                    {defTiersQ.length >
                                                                    0
                                                                        ? " / "
                                                                        : ""}
                                                                    {formatPrice(
                                                                        unitOpt
                                                                            .prices[
                                                                            defTiersQ
                                                                                .length
                                                                        ]
                                                                    )}
                                                                </Typography>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    mt: 1,
                                                    display: "block",
                                                    color: p.indigo,
                                                }}
                                            >
                                                Upravit ceny v záložce Ceník
                                            </Typography>
                                        </Box>
                                    );
                                })()}

                            {needsOptions && (
                                <Box>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ mb: 1 }}
                                    >
                                        Možnosti
                                    </Typography>
                                    {(inputData.options || []).map(
                                        (opt, idx) => {
                                            const optionUsedInCondition =
                                                opt && conditions
                                                    ? getConditionsUsingOptionValue(
                                                          field.id,
                                                          opt,
                                                          conditions
                                                      ).length > 0
                                                    : false;
                                            const meta = opt
                                                ? inputData.optionMeta?.[opt]
                                                : undefined;
                                            const showMeta =
                                                inputData.displayVariant ===
                                                "image_cards";
                                            return (
                                                <Box key={idx} sx={{ mb: 1.5 }}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            gap: 1,
                                                            alignItems:
                                                                "center",
                                                        }}
                                                    >
                                                        <TextField
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const oldVal =
                                                                    (inputData.options ||
                                                                        [])[
                                                                        idx
                                                                    ];
                                                                const newOptions =
                                                                    [
                                                                        ...(inputData.options ||
                                                                            []),
                                                                    ];
                                                                newOptions[
                                                                    idx
                                                                ] =
                                                                    e.target.value;
                                                                const newMeta =
                                                                    {
                                                                        ...(inputData.optionMeta ||
                                                                            {}),
                                                                    };
                                                                if (
                                                                    oldVal &&
                                                                    newMeta[
                                                                        oldVal
                                                                    ]
                                                                ) {
                                                                    newMeta[
                                                                        e.target.value
                                                                    ] =
                                                                        newMeta[
                                                                            oldVal
                                                                        ];
                                                                    delete newMeta[
                                                                        oldVal
                                                                    ];
                                                                }
                                                                updateInput({
                                                                    options:
                                                                        newOptions,
                                                                    optionMeta:
                                                                        newMeta,
                                                                });
                                                            }}
                                                            size="small"
                                                            fullWidth
                                                            placeholder={`Možnost ${idx + 1}`}
                                                            sx={builderFieldSx}
                                                        />
                                                        {optionUsedInCondition && (
                                                            <Chip
                                                                label="Podmínka"
                                                                size="small"
                                                                sx={{
                                                                    fontSize:
                                                                        "0.7rem",
                                                                    height: 20,
                                                                    flexShrink: 0,
                                                                    fontWeight: 600,
                                                                    backgroundColor:
                                                                        p.field,
                                                                    color: p.fieldInk,
                                                                    borderRadius:
                                                                        "6px",
                                                                }}
                                                            />
                                                        )}
                                                        <Tooltip
                                                            title={
                                                                optionUsedInCondition
                                                                    ? "Možnost je používána v podmínce"
                                                                    : "Smazat"
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        const removedOpt =
                                                                            (inputData.options ||
                                                                                [])[
                                                                                idx
                                                                            ];
                                                                        const newOptions =
                                                                            (
                                                                                inputData.options ||
                                                                                []
                                                                            ).filter(
                                                                                (
                                                                                    _,
                                                                                    i
                                                                                ) =>
                                                                                    i !==
                                                                                    idx
                                                                            );
                                                                        const newMeta =
                                                                            {
                                                                                ...(inputData.optionMeta ||
                                                                                    {}),
                                                                            };
                                                                        if (
                                                                            removedOpt
                                                                        )
                                                                            delete newMeta[
                                                                                removedOpt
                                                                            ];
                                                                        updateInput(
                                                                            {
                                                                                options:
                                                                                    newOptions,
                                                                                optionMeta:
                                                                                    Object.keys(
                                                                                        newMeta
                                                                                    )
                                                                                        .length >
                                                                                    0
                                                                                        ? newMeta
                                                                                        : undefined,
                                                                            }
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        optionUsedInCondition
                                                                    }
                                                                    sx={{
                                                                        color: p.ink3,
                                                                        borderRadius:
                                                                            "8px",
                                                                        "&:hover":
                                                                            {
                                                                                color: p.negInk,
                                                                                backgroundColor:
                                                                                    p.neg,
                                                                            },
                                                                    }}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Box>
                                                    {showMeta && opt && (
                                                        <OptionImageUploader
                                                            imageUrl={
                                                                meta?.imageUrl
                                                            }
                                                            onChange={(url) => {
                                                                const newMeta =
                                                                    {
                                                                        ...(inputData.optionMeta ||
                                                                            {}),
                                                                    };
                                                                newMeta[opt] = {
                                                                    imageUrl:
                                                                        url ||
                                                                        undefined,
                                                                };
                                                                updateInput({
                                                                    optionMeta:
                                                                        newMeta,
                                                                });
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            );
                                        }
                                    )}
                                    <Button
                                        startIcon={<Add />}
                                        size="small"
                                        onClick={() => {
                                            updateInput({
                                                options: [
                                                    ...(inputData.options ||
                                                        []),
                                                    "",
                                                ],
                                            });
                                        }}
                                        sx={dashedButtonSx}
                                    >
                                        Přidat možnost
                                    </Button>

                                    <Box sx={{ mt: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={
                                                        inputData.displayVariant ===
                                                        "image_cards"
                                                    }
                                                    onChange={(e) =>
                                                        updateInput({
                                                            displayVariant: e
                                                                .target.checked
                                                                ? "image_cards"
                                                                : undefined,
                                                        })
                                                    }
                                                    sx={indigoSwitchSx}
                                                />
                                            }
                                            label="Zobrazit jako karty s obrázky"
                                            sx={switchLabelSx}
                                        />
                                    </Box>
                                </Box>
                            )}
                        </>
                    ) : editData.type === "description" ? (
                        <RichTextEditor
                            value={layoutData.text}
                            onChange={(val: string) =>
                                updateLayout({
                                    text: val,
                                })
                            }
                            format="markdown"
                            minHeight={150}
                            placeholder="Text popisu..."
                            allowedTools={["formatting", "inserts", "undo"]}
                        />
                    ) : (
                        <TextField
                            label="Text nadpisu"
                            value={layoutData.text}
                            onChange={(e) =>
                                updateLayout({ text: e.target.value })
                            }
                            fullWidth
                            required
                            size="small"
                            sx={builderFieldSx}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={ghostButtonSx}>
                    Zrušit
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disableElevation
                    sx={indigoButtonSx}
                >
                    Uložit
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function OptionImageUploader({
    imageUrl,
    onChange,
}: {
    imageUrl?: string;
    onChange: (url: string | undefined) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(
        async (file: File) => {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                if (!res.ok) throw new Error("Upload selhal");
                const data = await res.json();
                if (data.url) onChange(data.url);
            } catch {
                /* silently fail */
            } finally {
                setUploading(false);
            }
        },
        [onChange]
    );

    return (
        <Box
            sx={{
                display: "flex",
                gap: 1,
                mt: 0.5,
                ml: 1,
                alignItems: "center",
            }}
        >
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                }}
            />
            {imageUrl ? (
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: `1px solid ${p.line}`,
                        position: "relative",
                        cursor: "pointer",
                        "&:hover .remove-overlay": {
                            opacity: 1,
                        },
                    }}
                    onClick={() => fileRef.current?.click()}
                >
                    <Box
                        component="img"
                        src={storageUrl(imageUrl)}
                        alt=""
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                    <IconButton
                        className="remove-overlay"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(undefined);
                        }}
                        sx={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            bgcolor: p.negInk,
                            color: "#fff",
                            opacity: 0,
                            transition: "opacity 0.2s",
                            width: 20,
                            height: 20,
                            "&:hover": {
                                bgcolor: p.neg,
                                color: p.negInk,
                            },
                        }}
                    >
                        <Delete sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>
            ) : (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                        uploading ? (
                            <CircularProgress size={16} />
                        ) : (
                            <ImageIcon />
                        )
                    }
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    sx={ghostButtonSx}
                >
                    {uploading ? "Nahrávám..." : "Nahrát obrázek"}
                </Button>
            )}
        </Box>
    );
}
