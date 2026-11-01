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
import { Delete } from "@mui/icons-material";
import { deleteSection } from "@/lib/actions/sections";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface SectionActionsProps {
    sectionId: string;
    sectionTitle: string;
}

export function SectionActions({
    sectionId,
    sectionTitle,
}: SectionActionsProps) {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteSection(sectionId);
        setLoading(false);
        setDeleteDialogOpen(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Sekce byla smazána");
            router.refresh();
        }
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 1,
                }}
            >
                <CircularProgress size={16} />
            </Box>
        );
    }

    return (
        <>
            <Tooltip title="Smazat sekci">
                <IconButton
                    size="small"
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                        color: p.ink3,
                        borderRadius: "8px",
                        "&:hover": {
                            color: p.negInk,
                            backgroundColor: p.neg,
                        },
                    }}
                >
                    <Delete sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat sekci?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat sekci{" "}
                        <strong>&quot;{sectionTitle}&quot;</strong>
                        ?
                        <br />
                        Tato akce je nevratná.
                    </DialogContentText>
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
