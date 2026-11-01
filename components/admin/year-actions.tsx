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
import { Delete, Archive, Unarchive, Star } from "@mui/icons-material";
import {
    setActiveYear,
    archiveYear,
    unarchiveYear,
    deleteYear,
} from "@/lib/actions/years";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

// Builder-palette icon button: 30px, transparent, hover → indigo soft.
const iconBtnSx = {
    color: p.ink3,
    borderRadius: "8px",
    "&:hover": {
        color: p.indigo,
        backgroundColor: p.indigoSoft,
    },
};

// Destructive variant: hover → soft-danger.
const dangerIconBtnSx = {
    color: p.ink3,
    borderRadius: "8px",
    "&:hover": {
        color: p.negInk,
        backgroundColor: p.neg,
    },
};

interface YearActionsProps {
    yearId: string;
    isActive: boolean;
    isArchived: boolean;
}

export function YearActions({
    yearId,
    isActive,
    isArchived,
}: YearActionsProps) {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetActive = async () => {
        setLoading(true);
        setError(null);
        const result = await setActiveYear(yearId);
        setLoading(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Ročník byl nastaven jako aktivní");
            router.refresh();
        }
    };

    const handleArchive = async () => {
        setLoading(true);
        setError(null);
        const result = await archiveYear(yearId);
        setLoading(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Ročník byl archivován");
            router.refresh();
        }
    };

    const handleUnarchive = async () => {
        setLoading(true);
        setError(null);
        const result = await unarchiveYear(yearId);
        setLoading(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Ročník byl obnoven z archivu");
            router.refresh();
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        const result = await deleteYear(yearId);
        setLoading(false);
        setDeleteDialogOpen(false);
        if (result.error) {
            setError(result.error);
            toast.error(result.error);
        } else {
            toast.success("Ročník byl smazán");
            router.refresh();
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ display: "flex", gap: 0.5 }}>
                {!isActive && (
                    <Tooltip title="Nastavit jako aktivní">
                        <IconButton
                            size="small"
                            onClick={handleSetActive}
                            sx={iconBtnSx}
                        >
                            <Star sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}

                {!isActive && !isArchived && (
                    <Tooltip title="Archivovat">
                        <IconButton
                            size="small"
                            onClick={handleArchive}
                            sx={iconBtnSx}
                        >
                            <Archive sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}

                {isArchived && (
                    <Tooltip title="Obnovit z archivu">
                        <IconButton
                            size="small"
                            onClick={handleUnarchive}
                            sx={iconBtnSx}
                        >
                            <Unarchive sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}

                {!isActive && (
                    <Tooltip title="Smazat">
                        <IconButton
                            size="small"
                            onClick={() => setDeleteDialogOpen(true)}
                            sx={dangerIconBtnSx}
                        >
                            <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat ročník?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat tento ročník? Tato akce je
                        nevratná a smaže všechny stránky, novinky a alba spojená
                        s tímto ročníkem.
                    </DialogContentText>
                    {error && (
                        <DialogContentText color="error" sx={{ mt: 2 }}>
                            {error}
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
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
                        onClick={handleDelete}
                        variant="contained"
                        disableElevation
                        sx={{
                            borderRadius: "10px",
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
