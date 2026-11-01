"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Switch,
    FormControlLabel,
    Typography,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import {
    createSection,
    updateSection,
    SectionActionState,
} from "@/lib/actions/sections";
import { BlockEditor } from "@/components/admin/block-editor";
import { IconPicker } from "@/components/admin/icon-picker";
import { TocPreview } from "@/components/admin/toc-preview";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";
import type { ContentBlock } from "@/lib/types/content-blocks";

interface SectionFormProps {
    mode: "create" | "edit";
    yearId: string;
    sectionTypeId: string;
    sectionId?: string;
    cancelHref: string;
    defaultValues?: {
        title?: string;
        subtitle?: string | null;
        description?: string | null;
        content?: ContentBlock[];
        showToc?: boolean;
        icon?: string | null;
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
                  ? "Vytvořit sekci"
                  : "Uložit změny"}
        </Button>
    );
}

export function SectionForm({
    mode,
    yearId,
    sectionTypeId,
    sectionId,
    cancelHref,
    defaultValues,
}: SectionFormProps) {
    const [blocks, setBlocks] = useState<ContentBlock[]>(
        Array.isArray(defaultValues?.content) ? defaultValues.content : []
    );
    const [showToc, setShowToc] = useState(defaultValues?.showToc || false);
    const [icon, setIcon] = useState<string | null>(
        defaultValues?.icon || null
    );
    const [description, setDescription] = useState(
        defaultValues?.description || ""
    );

    const action =
        mode === "create"
            ? createSection.bind(null, sectionTypeId)
            : updateSection.bind(null, sectionId as string);

    const [state, formAction] = useActionState<SectionActionState, FormData>(
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
                    alignItems: "flex-start",
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    p: 2.5,
                }}
            >
                <IconPicker value={icon} onChange={setIcon} />
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
                        label="Název sekce"
                        defaultValue={defaultValues?.title || ""}
                        error={!!state?.error?.title}
                        helperText={state?.error?.title?.[0]}
                        sx={builderFieldSx}
                    />
                    <TextField
                        size="small"
                        id="subtitle"
                        name="subtitle"
                        label="Podtitulek"
                        defaultValue={defaultValues?.subtitle || ""}
                        sx={builderFieldSx}
                    />
                </Box>
                <Box
                    sx={{
                        width: 360,
                        flexShrink: 0,
                        alignSelf: "flex-start",
                    }}
                >
                    <input
                        type="hidden"
                        name="description"
                        value={description}
                    />
                    <Box
                        sx={{
                            border: `1px solid ${p.line}`,
                            borderRadius: "10px",
                            overflow: "hidden",
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                px: 1.5,
                                pt: 1,
                                pb: 0.5,
                                color: p.ink3,
                                backgroundColor: p.surface2,
                                borderBottom: `1px solid ${p.line}`,
                            }}
                        >
                            Popis pro úvodní stránku
                        </Typography>
                        <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            format="markdown"
                            minHeight={48}
                            allowedTools={["basicFormatting"]}
                            placeholder="Krátký popis sekce…"
                        />
                    </Box>
                </Box>
                <Box sx={{ flex: 1 }} />
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "flex-end",
                    }}
                >
                    <Box sx={{ display: "flex", gap: 1 }}>
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
                    <FormControlLabel
                        labelPlacement="start"
                        control={
                            <Switch
                                name="showToc"
                                value="true"
                                size="small"
                                checked={showToc}
                                onChange={(e) => setShowToc(e.target.checked)}
                                sx={{
                                    "& .MuiSwitch-switchBase.Mui-checked": {
                                        color: p.indigo,
                                    },
                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                        {
                                            backgroundColor: p.indigo,
                                        },
                                }}
                            />
                        }
                        label="Zobrazit obsah"
                        sx={{ py: 0.75, mr: 0 }}
                    />
                </Box>
            </Box>

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

            <input
                type="hidden"
                name="content"
                value={JSON.stringify(blocks)}
            />

            <TocPreview show={showToc} blocks={blocks}>
                <BlockEditor
                    value={blocks}
                    onChange={setBlocks}
                    yearId={yearId}
                />
            </TocPreview>
        </Box>
    );
}
