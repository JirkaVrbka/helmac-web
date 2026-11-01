"use client";

import { useState, useTransition } from "react";
import {
    Alert,
    Box,
    Button,
    FormControlLabel,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { Save, Delete, Sync, Edit } from "@mui/icons-material";
import {
    saveGlobalFioToken,
    removeGlobalFioToken,
    toggleGlobalFioSync,
    triggerGlobalManualSync,
} from "@/lib/actions/bank-account";
import type { MatchResult } from "@/lib/utils/payment-matching";
import { formatDateTime } from "@/lib/utils/date";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface FioTokenSettingsProps {
    hasToken: boolean;
    syncEnabled: boolean;
    lastSyncAt: string | null;
}

const ghostButtonSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": {
        borderColor: p.indigo,
        backgroundColor: p.indigoSoft,
        color: p.indigo,
        boxShadow: "none",
    },
};

const primaryButtonSx = {
    backgroundColor: p.indigo,
    color: "#fff",
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
};

const dangerButtonSx = {
    backgroundColor: p.neg,
    color: p.negInk,
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": { backgroundColor: "#fecaca", boxShadow: "none" },
};

const builderSwitchSx = {
    "& .MuiSwitch-thumb": { color: "#fff" },
    "& .MuiSwitch-track": {
        backgroundColor: p.surface3,
        opacity: 1,
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: p.indigo,
        opacity: 1,
    },
};

export function FioTokenSettings({
    hasToken: initialHasToken,
    syncEnabled: initialSyncEnabled,
    lastSyncAt: initialLastSyncAt,
}: FioTokenSettingsProps) {
    const [hasToken, setHasToken] = useState(initialHasToken);
    const [syncEnabled, setSyncEnabled] = useState(initialSyncEnabled);
    const [lastSyncAt, setLastSyncAt] = useState(initialLastSyncAt);
    const [isEditing, setIsEditing] = useState(false);
    const [token, setToken] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
        {}
    );
    const [success, setSuccess] = useState<string | null>(null);
    const [syncResult, setSyncResult] = useState<MatchResult | null>(null);
    const [isSaving, startSaving] = useTransition();
    const [isRemoving, startRemoving] = useTransition();
    const [isToggling, startToggling] = useTransition();
    const [isSyncing, startSyncing] = useTransition();

    const handleSaveToken = () => {
        setError(null);
        setFieldErrors({});
        setSuccess(null);

        startSaving(async () => {
            const formData = new FormData();
            formData.set("fioToken", token);
            const result = await saveGlobalFioToken(formData);

            if (result && "error" in result && result.error) {
                if (typeof result.error === "string") {
                    setError(result.error);
                } else {
                    setFieldErrors(result.error as Record<string, string[]>);
                }
            } else {
                setHasToken(true);
                setToken("");
                setSuccess("Token byl uložen");
                setTimeout(() => setSuccess(null), 3000);
            }
        });
    };

    const handleRemoveToken = () => {
        setError(null);
        setSuccess(null);

        startRemoving(async () => {
            const result = await removeGlobalFioToken();
            if (result && "error" in result && result.error) {
                setError(
                    typeof result.error === "string" ? result.error : "Chyba"
                );
            } else {
                setHasToken(false);
                setSyncEnabled(false);
                setSuccess("Token byl odebrán");
                setTimeout(() => setSuccess(null), 3000);
            }
        });
    };

    const handleToggleSync = (checked: boolean) => {
        setError(null);
        setSuccess(null);

        startToggling(async () => {
            const result = await toggleGlobalFioSync(checked);
            if (result && "error" in result && result.error) {
                setError(
                    typeof result.error === "string" ? result.error : "Chyba"
                );
            } else {
                setSyncEnabled(checked);
            }
        });
    };

    const handleManualSync = () => {
        setError(null);
        setSuccess(null);
        setSyncResult(null);

        startSyncing(async () => {
            const result = await triggerGlobalManualSync();
            if (result && "error" in result && result.error) {
                setError(
                    typeof result.error === "string" ? result.error : "Chyba"
                );
            } else if (result && "result" in result && result.result) {
                setSyncResult(result.result);
                setLastSyncAt(new Date().toISOString());
                setSuccess("Synchronizace dokončena");
                setTimeout(() => setSuccess(null), 5000);
            }
        });
    };

    return (
        <Box
            sx={{
                mt: 3,
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            {/* Header strip with kicker + edit/done button */}
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: `1px solid ${p.line}`,
                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                }}
            >
                <Typography
                    sx={{
                        flex: 1,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: p.ink3,
                    }}
                >
                    Fio Banka — automatické párování plateb
                </Typography>
                {!isEditing ? (
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setIsEditing(true)}
                        size="small"
                        sx={ghostButtonSx}
                    >
                        Upravit
                    </Button>
                ) : (
                    <Button
                        variant="outlined"
                        onClick={() => setIsEditing(false)}
                        size="small"
                        sx={ghostButtonSx}
                    >
                        Hotovo
                    </Button>
                )}
            </Box>

            <Box sx={{ p: 2.5 }}>
                {!isEditing ? (
                    <>
                        {/* Read-only display */}
                        <Box
                            sx={{
                                px: 2,
                                py: 1.25,
                                borderRadius: "10px",
                                backgroundColor: p.surface2,
                                border: `1px solid ${p.line}`,
                                mb: 2,
                            }}
                        >
                            <Typography variant="body2" sx={{ color: p.ink }}>
                                {hasToken
                                    ? "Fio API token je nastaven."
                                    : "Fio API token není nastaven."}
                            </Typography>
                            {hasToken && (
                                <Typography
                                    variant="body2"
                                    sx={{ color: p.ink }}
                                >
                                    Automatická synchronizace:{" "}
                                    {syncEnabled ? "zapnuto" : "vypnuto"}
                                </Typography>
                            )}
                            {hasToken && lastSyncAt && (
                                <Typography
                                    variant="body2"
                                    sx={{ color: p.ink }}
                                >
                                    Poslední synchronizace:{" "}
                                    {formatDateTime(lastSyncAt)}
                                </Typography>
                            )}
                        </Box>

                        {/* Manual sync button — always visible outside edit mode when token is set */}
                        {hasToken && (
                            <Button
                                variant="outlined"
                                startIcon={<Sync />}
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                size="small"
                                sx={ghostButtonSx}
                            >
                                {isSyncing
                                    ? "Synchronizuji..."
                                    : "Synchronizovat nyní"}
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        {/* Edit mode — interactive controls */}
                        {!hasToken ? (
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    label="Fio API token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    fullWidth
                                    size="small"
                                    type="password"
                                    placeholder="64znakový API token z Fio internetbanking"
                                    error={!!fieldErrors.fioToken}
                                    helperText={fieldErrors.fioToken?.[0]}
                                    sx={{ mb: 1, ...builderFieldSx }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    onClick={handleSaveToken}
                                    disabled={isSaving || !token}
                                    size="small"
                                    sx={primaryButtonSx}
                                >
                                    {isSaving ? "Ukládání..." : "Uložit token"}
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ mb: 2 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: p.ink2, mb: 1 }}
                                >
                                    Fio API token je nastaven.
                                </Typography>
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<Delete />}
                                    onClick={handleRemoveToken}
                                    disabled={isRemoving}
                                    size="small"
                                    sx={dangerButtonSx}
                                >
                                    {isRemoving
                                        ? "Odebírání..."
                                        : "Odebrat token"}
                                </Button>
                            </Box>
                        )}

                        {/* Sync toggle */}
                        {hasToken && (
                            <Box sx={{ mb: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={syncEnabled}
                                            onChange={(e) =>
                                                handleToggleSync(
                                                    e.target.checked
                                                )
                                            }
                                            disabled={isToggling}
                                            sx={builderSwitchSx}
                                        />
                                    }
                                    label="Automatická synchronizace (jednou denně)"
                                    sx={{
                                        "& .MuiFormControlLabel-label": {
                                            color: p.ink2,
                                        },
                                    }}
                                />
                            </Box>
                        )}

                        {/* Manual sync button — also available in edit mode */}
                        {hasToken && (
                            <Button
                                variant="outlined"
                                startIcon={<Sync />}
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                size="small"
                                sx={ghostButtonSx}
                            >
                                {isSyncing
                                    ? "Synchronizuji..."
                                    : "Synchronizovat nyní"}
                            </Button>
                        )}
                    </>
                )}

                {/* Status messages — always visible */}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        {success}
                    </Alert>
                )}

                {/* Sync result — always visible */}
                {syncResult && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            Zpracováno: {syncResult.total} transakcí
                        </Typography>
                        {syncResult.matched > 0 && (
                            <Typography variant="body2">
                                Spárováno: {syncResult.matched}
                            </Typography>
                        )}
                        {syncResult.overpayment > 0 && (
                            <Typography variant="body2">
                                Přeplatky: {syncResult.overpayment}
                            </Typography>
                        )}
                        {syncResult.partial > 0 && (
                            <Typography variant="body2">
                                Částečné platby: {syncResult.partial}
                            </Typography>
                        )}
                        {syncResult.unknownVs > 0 && (
                            <Typography variant="body2">
                                Neznámý VS: {syncResult.unknownVs}
                            </Typography>
                        )}
                        {syncResult.alreadyPaid > 0 && (
                            <Typography variant="body2">
                                Již zaplaceno: {syncResult.alreadyPaid}
                            </Typography>
                        )}
                        {syncResult.outgoing > 0 && (
                            <Typography variant="body2">
                                Odchozí: {syncResult.outgoing}
                            </Typography>
                        )}
                        {syncResult.noVs > 0 && (
                            <Typography variant="body2">
                                Bez VS: {syncResult.noVs}
                            </Typography>
                        )}
                        {syncResult.duplicates > 0 && (
                            <Typography variant="body2">
                                Duplikáty: {syncResult.duplicates}
                            </Typography>
                        )}
                        {syncResult.emailsSent > 0 && (
                            <Typography variant="body2">
                                Odesláno emailů: {syncResult.emailsSent}
                            </Typography>
                        )}
                        {syncResult.errors.length > 0 && (
                            <Typography variant="body2" color="error">
                                Chyby: {syncResult.errors.join(", ")}
                            </Typography>
                        )}
                    </Alert>
                )}
            </Box>
        </Box>
    );
}
