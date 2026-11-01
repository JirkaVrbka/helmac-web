"use client";

import { useState, useTransition } from "react";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Autocomplete,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
} from "@mui/material";
import { LinkRounded } from "@mui/icons-material";
import { pairTransactionWithOrder } from "@/lib/actions/bank-transactions";
import type { UnpaidOrderOption } from "@/lib/services/v2";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface PairTransactionButtonProps {
    transactionId: string;
    unpaidOrders: UnpaidOrderOption[];
}

export function PairTransactionButton({
    transactionId,
    unpaidOrders,
}: PairTransactionButtonProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<UnpaidOrderOption | null>(null);
    const [showPartial, setShowPartial] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredOrders = showPartial
        ? unpaidOrders
        : unpaidOrders.filter((o) => !o.partiallyPaid);

    const handleOpen = () => {
        setSelected(null);
        setShowPartial(false);
        setError(null);
        setOpen(true);
    };

    const handleClose = () => {
        if (!isPending) {
            setOpen(false);
        }
    };

    const handlePair = () => {
        if (!selected) return;
        startTransition(async () => {
            const result = await pairTransactionWithOrder(
                transactionId,
                selected.id
            );
            if (result.error) {
                setError(result.error);
            } else {
                setOpen(false);
            }
        });
    };

    return (
        <>
            <Button
                size="small"
                variant="text"
                startIcon={<LinkRounded />}
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpen();
                }}
                sx={{
                    color: p.indigo,
                    fontWeight: 600,
                    "&:hover": {
                        backgroundColor: p.indigoSoft,
                    },
                }}
            >
                Spárovat
            </Button>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                onClick={(e) => e.stopPropagation()}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Spárovat transakci s registrací
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Typography variant="body2" sx={{ mb: 2, color: p.ink2 }}>
                        Vyberte nezaplacenou registraci, ke které tato transakce
                        patří.
                    </Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={showPartial}
                                onChange={(_, v) => {
                                    setShowPartial(v);
                                    setSelected(null);
                                }}
                                sx={{
                                    "& .MuiSwitch-switchBase.Mui-checked": {
                                        color: p.surface,
                                    },
                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                        {
                                            backgroundColor: p.indigo,
                                            opacity: 1,
                                        },
                                }}
                            />
                        }
                        label="Zobrazit i částečně zaplacené"
                        sx={{
                            mb: 1,
                            "& .MuiFormControlLabel-label": {
                                color: p.ink2,
                            },
                        }}
                    />
                    <Autocomplete
                        options={filteredOrders}
                        value={selected}
                        onChange={(_, value) => setSelected(value)}
                        getOptionLabel={(o) => {
                            const parts = [
                                o.variableSymbol
                                    ? `VS ${o.variableSymbol}`
                                    : "",
                                o.label,
                                o.totalPrice != null
                                    ? `${o.totalPrice.toLocaleString("cs-CZ")} Kč`
                                    : "",
                            ].filter(Boolean);
                            return parts.join(" — ");
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Registrace"
                                placeholder="Hledat podle VS, jména..."
                                autoFocus
                            />
                        )}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        noOptionsText="Žádné nezaplacené registrace"
                        sx={{ mt: 1, ...builderFieldSx }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        sx={{
                            backgroundColor: p.surface,
                            border: `1px solid ${p.line}`,
                            color: p.ink2,
                            borderRadius: "10px",
                            "&:hover": {
                                backgroundColor: p.surface2,
                                borderColor: p.ink3,
                            },
                        }}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handlePair}
                        variant="contained"
                        disableElevation
                        disabled={isPending || !selected}
                        sx={{
                            backgroundColor: p.indigo,
                            color: p.surface,
                            borderRadius: "10px",
                            boxShadow: "none",
                            "&:hover": {
                                backgroundColor: "#4338ca",
                                boxShadow: "none",
                            },
                        }}
                    >
                        {isPending ? "Párování..." : "Spárovat"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
