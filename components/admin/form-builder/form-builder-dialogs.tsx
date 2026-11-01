"use client";

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from "@mui/material";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const dialogPaperSx = { borderRadius: "14px" } as const;

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

const softDangerButtonSx = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    backgroundColor: p.neg,
    color: p.negInk,
    boxShadow: "none",
    "&:hover": {
        backgroundColor: "#fecaca",
        boxShadow: "none",
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

export interface DeletionBlockInfo {
    title: string;
    message: string;
    details: string[];
}

interface DeleteFormDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteFormDialog({
    open,
    onClose,
    onConfirm,
}: DeleteFormDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: dialogPaperSx }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Smazat formulář?</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ color: p.ink2 }}>
                    Tato akce smaže registrační formulář a všechny přijaté
                    registrace. Tuto akci nelze vrátit.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={ghostButtonSx}>
                    Zrušit
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    disableElevation
                    sx={softDangerButtonSx}
                >
                    Smazat
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface DeletionBlockDialogProps {
    info: DeletionBlockInfo | null;
    onClose: () => void;
}

export function DeletionBlockDialog({
    info,
    onClose,
}: DeletionBlockDialogProps) {
    return (
        <Dialog
            open={!!info}
            onClose={onClose}
            PaperProps={{ sx: dialogPaperSx }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>{info?.title}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ color: p.ink2 }}>
                    {info?.message}
                </DialogContentText>
                {info?.details && (
                    <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                        {info.details.map((d, i) => (
                            <li key={i}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: p.ink2 }}
                                >
                                    {d}
                                </Typography>
                            </li>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    variant="contained"
                    disableElevation
                    sx={indigoButtonSx}
                >
                    Rozumím
                </Button>
            </DialogActions>
        </Dialog>
    );
}
