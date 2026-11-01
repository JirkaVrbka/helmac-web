"use client";

import { useState } from "react";
import {
    Box,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
} from "@mui/material";
import { Delete, Visibility, VisibilityOff } from "@mui/icons-material";
import { publishPage, unpublishPage, deletePage } from "@/lib/actions/pages";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface PageActionsProps {
    pageId: string;
    isPublished: boolean;
}

const iconButtonSx = {
    width: 30,
    height: 30,
    borderRadius: "8px",
    color: p.ink3,
    transition: "all 140ms ease",
    "&:hover": {
        color: p.indigo,
        backgroundColor: p.indigoSoft,
    },
} as const;

const dangerIconButtonSx = {
    width: 30,
    height: 30,
    borderRadius: "8px",
    color: p.ink3,
    transition: "all 140ms ease",
    "&:hover": {
        color: p.negInk,
        backgroundColor: p.neg,
    },
} as const;

export function PageActions({ pageId, isPublished }: PageActionsProps) {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTogglePublish = async () => {
        setLoading(true);
        setError(null);
        const result = isPublished
            ? await unpublishPage(pageId)
            : await publishPage(pageId);
        setLoading(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(
                isPublished ? "Stránka byla skryta" : "Stránka byla publikována"
            );
            router.refresh();
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        const result = await deletePage(pageId);
        setLoading(false);
        setDeleteDialogOpen(false);
        if (result.error) {
            setError(result.error);
            toast.error(result.error);
        } else {
            toast.success("Stránka byla smazána");
            router.refresh();
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", px: 1 }}>
                <CircularProgress size={20} sx={{ color: p.indigo }} />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ display: "flex", gap: 0.25 }}>
                <Tooltip
                    title={isPublished ? "Skrýt stránku" : "Publikovat stránku"}
                >
                    <IconButton
                        size="small"
                        onClick={handleTogglePublish}
                        sx={iconButtonSx}
                    >
                        {isPublished ? (
                            <VisibilityOff sx={{ fontSize: 16 }} />
                        ) : (
                            <Visibility sx={{ fontSize: 16 }} />
                        )}
                    </IconButton>
                </Tooltip>

                <Tooltip title="Smazat stránku">
                    <IconButton
                        size="small"
                        onClick={() => setDeleteDialogOpen(true)}
                        sx={dangerIconButtonSx}
                    >
                        <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat stránku?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat tuto stránku? Tato akce je
                        nevratná.
                    </DialogContentText>
                    {error && (
                        <DialogContentText sx={{ mt: 2, color: p.negInk }}>
                            {error}
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            color: p.ink2,
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
                        onClick={handleDelete}
                        disableElevation
                        sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            backgroundColor: p.neg,
                            color: p.negInk,
                            "&:hover": { backgroundColor: "#fecaca" },
                        }}
                    >
                        Smazat
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
