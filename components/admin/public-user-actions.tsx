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
import { deletePublicUser } from "@/lib/actions/public-users";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface PublicUserActionsProps {
    userId: string;
    userEmail: string;
    registrationCount: number;
}

export function PublicUserActions({
    userId,
    userEmail,
    registrationCount,
}: PublicUserActionsProps) {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        const result = await deletePublicUser(userId);
        setLoading(false);
        if (result.error) {
            setError(result.error);
            toast.error(result.error);
        } else {
            setDeleteDialogOpen(false);
            toast.success("Účastník byl smazán");
            router.refresh();
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", px: 1 }}>
                <CircularProgress size={20} />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ display: "flex", gap: 0.5 }}>
                <Tooltip title="Smazat účastníka">
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
            </Box>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setError(null);
                }}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat účastníka?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat účastníka{" "}
                        <strong>{userEmail}</strong>?
                    </DialogContentText>
                    {registrationCount > 0 && (
                        <DialogContentText sx={{ mt: 1 }}>
                            Tento účastník má{" "}
                            <strong>{registrationCount}</strong>{" "}
                            {registrationCount === 1
                                ? "registraci"
                                : registrationCount < 5
                                  ? "registrace"
                                  : "registrací"}
                            . Registrace zůstanou zachovány, ale nebudou
                            přiřazeny k žádnému účtu.
                        </DialogContentText>
                    )}
                    <DialogContentText sx={{ mt: 1 }}>
                        Tato akce je nevratná.
                    </DialogContentText>
                    {error && (
                        <DialogContentText color="error" sx={{ mt: 2 }}>
                            {error}
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setDeleteDialogOpen(false);
                            setError(null);
                        }}
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
