"use client";

import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Tooltip,
    Typography,
} from "@mui/material";
import { Delete, Edit, NetworkCheck } from "@mui/icons-material";
import {
    deleteEmailAccount,
    testEmailAccount,
} from "@/lib/actions/email-accounts";
import { useSnackbar } from "notistack";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface EmailAccountCardProps {
    account: {
        id: string;
        email: string;
        label: string | null;
        isMain: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    onEdit: (id: string) => void;
}

const iconBtnSx = {
    width: 30,
    height: 30,
    borderRadius: "8px",
    color: p.ink3,
    "&:hover": { color: p.indigo, backgroundColor: p.indigoSoft },
};

const dangerIconBtnSx = {
    width: 30,
    height: 30,
    borderRadius: "8px",
    color: p.ink3,
    "&:hover": { color: p.negInk, backgroundColor: p.neg },
};

export function EmailAccountCard({ account, onEdit }: EmailAccountCardProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [testing, setTesting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        const result = await deleteEmailAccount(account.id);
        setDeleting(false);
        setDeleteOpen(false);

        if (result?.error) {
            enqueueSnackbar(
                typeof result.error === "string"
                    ? result.error
                    : "Nepodařilo se smazat účet",
                { variant: "error" }
            );
        } else {
            enqueueSnackbar("Emailový účet byl smazán", { variant: "success" });
        }
    };

    const handleTest = async () => {
        setTesting(true);
        const result = await testEmailAccount(account.id);
        setTesting(false);

        if (result.success) {
            enqueueSnackbar("Připojení k SMTP serveru je funkční", {
                variant: "success",
            });
        } else {
            enqueueSnackbar(result.error || "Test selhal", {
                variant: "error",
            });
        }
    };

    return (
        <>
            <Box
                sx={{
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        p: 2.5,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                mb: 0.5,
                            }}
                        >
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: "1.05rem",
                                    fontWeight: 700,
                                    color: p.ink,
                                }}
                            >
                                {account.email}
                            </Typography>
                            {account.isMain && (
                                <Box
                                    component="span"
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        px: "9px",
                                        py: "3px",
                                        borderRadius: "20px",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: p.field,
                                        color: p.fieldInk,
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            backgroundColor: "currentColor",
                                        }}
                                    />
                                    Hlavní
                                </Box>
                            )}
                        </Box>
                        {account.label && (
                            <Typography variant="body2" sx={{ color: p.ink2 }}>
                                {account.label}
                            </Typography>
                        )}
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                mt: 1,
                                color: p.ink3,
                                fontFamily: "'JetBrains Mono', monospace",
                            }}
                        >
                            SMTP: smtp.seznam.cz:465
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                        <Tooltip title="Test připojení">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleTest}
                                    disabled={testing}
                                    sx={iconBtnSx}
                                >
                                    {testing ? (
                                        <CircularProgress size={18} />
                                    ) : (
                                        <NetworkCheck sx={{ fontSize: 18 }} />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Upravit">
                            <IconButton
                                size="small"
                                onClick={() => onEdit(account.id)}
                                sx={iconBtnSx}
                            >
                                <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Smazat">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => setDeleteOpen(true)}
                                    disabled={account.isMain}
                                    sx={dangerIconBtnSx}
                                >
                                    <Delete sx={{ fontSize: 18 }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat emailový účet
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat emailový účet{" "}
                        <strong>{account.email}</strong>? Šablony emailů, které
                        tento účet používají, budou přepnuty na hlavní účet.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteOpen(false)}
                        disabled={deleting}
                        sx={{
                            backgroundColor: p.surface,
                            border: `1px solid ${p.line}`,
                            color: p.ink2,
                            borderRadius: "10px",
                            "&:hover": {
                                borderColor: p.indigo,
                                backgroundColor: p.indigoSoft,
                                color: p.indigo,
                            },
                        }}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={deleting}
                        disableElevation
                        variant="contained"
                        sx={{
                            backgroundColor: p.neg,
                            color: p.negInk,
                            borderRadius: "10px",
                            boxShadow: "none",
                            "&:hover": {
                                backgroundColor: "#fecaca",
                                boxShadow: "none",
                            },
                        }}
                    >
                        {deleting ? "Mazání..." : "Smazat"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
