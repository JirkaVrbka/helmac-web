"use client";

import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { Edit, Save } from "@mui/icons-material";
import { updateGlobalBankAccount } from "@/lib/actions/bank-account";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface BankAccountSettingsProps {
    bankAccountPrefix: string | null;
    bankAccountNumber: string | null;
    bankAccountBankCode: string | null;
    bankSwift: string | null;
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

export function BankAccountSettings({
    bankAccountPrefix,
    bankAccountNumber,
    bankAccountBankCode,
    bankSwift,
}: BankAccountSettingsProps) {
    const [bankPrefix, setBankPrefix] = useState(bankAccountPrefix ?? "");
    const [bankNumber, setBankNumber] = useState(bankAccountNumber ?? "");
    const [bankCode, setBankCode] = useState(bankAccountBankCode ?? "");
    const [swift, setSwift] = useState(bankSwift ?? "");
    const [bankSaving, setBankSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasSavedBank = Boolean(bankAccountNumber);
    const [bankEditing, setBankEditing] = useState(!hasSavedBank);

    const handleBankSave = async () => {
        setBankSaving(true);
        setError(null);
        const fd = new FormData();
        fd.set("bankAccountPrefix", bankPrefix);
        fd.set("bankAccountNumber", bankNumber);
        fd.set("bankAccountBankCode", bankCode);
        fd.set("bankSwift", swift);
        const result = await updateGlobalBankAccount(fd);
        if (result.error) {
            setError(
                typeof result.error === "string"
                    ? result.error
                    : Object.values(result.error).flat().join(", ")
            );
        } else {
            setBankEditing(false);
        }
        setBankSaving(false);
    };

    const handleBankCancel = () => {
        setBankPrefix(bankAccountPrefix ?? "");
        setBankNumber(bankAccountNumber ?? "");
        setBankCode(bankAccountBankCode ?? "");
        setSwift(bankSwift ?? "");
        setBankEditing(false);
        setError(null);
    };

    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            {/* Header strip with kicker + edit/cancel/save buttons */}
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
                    Bankovní účet pro platbu
                </Typography>
                {!bankEditing && hasSavedBank && (
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setBankEditing(true)}
                        size="small"
                        sx={ghostButtonSx}
                    >
                        Upravit
                    </Button>
                )}
                {bankEditing && hasSavedBank && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                            variant="outlined"
                            onClick={handleBankCancel}
                            disabled={bankSaving}
                            size="small"
                            sx={ghostButtonSx}
                        >
                            Zrušit
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Save />}
                            onClick={handleBankSave}
                            disabled={bankSaving}
                            size="small"
                            sx={primaryButtonSx}
                        >
                            {bankSaving ? "Ukládám..." : "Uložit"}
                        </Button>
                    </Box>
                )}
            </Box>

            <Box sx={{ p: 2.5 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!bankEditing && hasSavedBank ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                            px: 2,
                            py: 1.25,
                            borderRadius: "10px",
                            backgroundColor: p.surface2,
                            border: `1px solid ${p.line}`,
                        }}
                    >
                        <Typography variant="body2" sx={{ color: p.ink }}>
                            {bankPrefix && <>{bankPrefix}-</>}
                            <Typography
                                component="span"
                                variant="body2"
                                fontWeight={600}
                            >
                                {bankNumber}
                            </Typography>
                            /{bankCode}
                        </Typography>
                        {swift && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: p.ink3,
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                SWIFT: {swift}
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                            }}
                        >
                            <TextField
                                label="Předčíslí"
                                value={bankPrefix}
                                onChange={(e) => setBankPrefix(e.target.value)}
                                disabled={bankSaving}
                                size="small"
                                sx={{ width: 100, ...builderFieldSx }}
                                inputProps={{ maxLength: 6 }}
                            />
                            <Typography sx={{ color: p.ink2 }}>-</Typography>
                            <TextField
                                label="Číslo účtu"
                                value={bankNumber}
                                onChange={(e) => setBankNumber(e.target.value)}
                                disabled={bankSaving}
                                size="small"
                                sx={{ flex: 1, ...builderFieldSx }}
                                inputProps={{ maxLength: 10 }}
                            />
                            <Typography sx={{ color: p.ink2 }}>/</Typography>
                            <TextField
                                label="Kód banky"
                                value={bankCode}
                                onChange={(e) => setBankCode(e.target.value)}
                                disabled={bankSaving}
                                size="small"
                                sx={{ width: 100, ...builderFieldSx }}
                                inputProps={{ maxLength: 4 }}
                            />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                label="SWIFT / BIC"
                                value={swift}
                                onChange={(e) => setSwift(e.target.value)}
                                disabled={bankSaving}
                                size="small"
                                fullWidth
                                inputProps={{
                                    maxLength: 11,
                                    style: {
                                        textTransform: "uppercase",
                                        fontFamily: "monospace",
                                    },
                                }}
                                placeholder="např. GIBACZPX"
                                helperText="SWIFT/BIC kód banky pro zahraniční platby (8 nebo 11 znaků, volitelné)"
                                sx={builderFieldSx}
                            />
                        </Box>
                        {!hasSavedBank && (
                            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    size="small"
                                    onClick={handleBankSave}
                                    disabled={bankSaving}
                                    sx={primaryButtonSx}
                                >
                                    {bankSaving ? "Ukládám..." : "Uložit"}
                                </Button>
                            </Box>
                        )}
                    </>
                )}
                <Typography
                    variant="caption"
                    sx={{ mt: 1, display: "block", color: p.ink3 }}
                >
                    Pokud je vyplněno, po registraci se zobrazí QR kód pro
                    platbu
                </Typography>
            </Box>
        </Box>
    );
}
