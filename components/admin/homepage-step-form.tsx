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
    Typography,
} from "@mui/material";
import { IconPicker } from "@/components/admin/icon-picker";
import {
    createHomepageStep,
    updateHomepageStep,
    HomepageStepActionState,
} from "@/lib/actions/homepage-steps";
import { useRouter } from "next/navigation";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface HomepageStepFormProps {
    mode: "create" | "edit";
    yearId: string;
    stepId?: string;
    defaultValues?: {
        title?: string;
        description?: string;
        icon?: string | null;
    };
    open: boolean;
    onClose: () => void;
}

export function HomepageStepForm({
    mode,
    yearId,
    stepId,
    defaultValues,
    open,
    onClose,
}: HomepageStepFormProps) {
    const router = useRouter();
    const [icon, setIcon] = useState<string | null>(
        defaultValues?.icon || null
    );
    const [title, setTitle] = useState(defaultValues?.title || "");
    const [description, setDescription] = useState(
        defaultValues?.description || ""
    );

    const serverAction =
        mode === "create"
            ? createHomepageStep.bind(null, yearId)
            : updateHomepageStep.bind(null, stepId as string);

    const [state, formAction, isPending] = useActionState<
        HomepageStepActionState,
        FormData
    >(async (prev, formData) => {
        const result = await serverAction(prev, formData);
        if (result?.success) {
            onClose();
            router.refresh();
        }
        return result;
    }, null);

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
                    {mode === "create" ? "Nový krok" : "Upravit krok"}
                </DialogTitle>
                <DialogContent>
                    {state?.error?._form && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {state.error._form[0]}
                        </Alert>
                    )}

                    <input type="hidden" name="icon" value={icon || ""} />
                    <Box
                        sx={{
                            display: "flex",
                            gap: 3,
                            alignItems: "flex-start",
                        }}
                    >
                        <Box>
                            <IconPicker value={icon} onChange={setIcon} />
                            {state?.error?.icon && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        mt: 0.5,
                                        display: "block",
                                        textAlign: "center",
                                        color: p.negInk,
                                    }}
                                >
                                    {state.error.icon[0]}
                                </Typography>
                            )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                autoFocus
                                required
                                fullWidth
                                margin="dense"
                                name="title"
                                label="Název"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                error={!!state?.error?.title}
                                helperText={state?.error?.title?.[0]}
                                sx={builderFieldSx}
                            />
                        </Box>
                    </Box>
                    <TextField
                        required
                        fullWidth
                        margin="dense"
                        name="description"
                        label="Popis"
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        error={!!state?.error?.description}
                        helperText={state?.error?.description?.[0]}
                        sx={builderFieldSx}
                    />
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
