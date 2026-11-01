"use client";

import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Switch,
    Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Warning } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import {
    toggleRegistration,
    updateRegistrationStartDate,
} from "@/lib/actions/years";
import { formatPrice } from "@/lib/utils/pricing";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const MONO = "'JetBrains Mono', monospace";

const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
} as const;

const paneHeadSx = {
    px: 2.5,
    py: 1.75,
    borderBottom: `1px solid ${p.line}`,
    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
} as const;

const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: p.ink3,
    fontWeight: 700,
} as const;

const ghostBtnSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    textTransform: "none",
    borderRadius: "10px",
    "&:hover": { borderColor: p.ink3, backgroundColor: p.surface2 },
} as const;

const indigoBtnSx = {
    backgroundColor: p.indigo,
    color: "#fff",
    textTransform: "none",
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
} as const;

const dialogPaperProps = { sx: { borderRadius: "14px" } } as const;

const switchSx = {
    "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: p.indigo,
        opacity: 1,
    },
    "& .MuiSwitch-track": { backgroundColor: p.surface3, opacity: 1 },
} as const;

interface RegistrationSettingsProps {
    yearId: string;
    registrationOpen: boolean;
    registrationStartDate: Date | null;
    submissionCount: number;
    totalPeopleCount: number;
    paidSum: number;
    unpaidSum: number;
    hasMainEmail: boolean;
    hasBankAccount: boolean;
}

export function RegistrationSettings({
    yearId,
    registrationOpen,
    registrationStartDate,
    submissionCount,
    totalPeopleCount,
    paidSum,
    unpaidSum,
    hasMainEmail,
    hasBankAccount,
}: RegistrationSettingsProps) {
    const [isOpen, setIsOpen] = useState(registrationOpen);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [constraintsOpen, setConstraintsOpen] = useState(false);
    const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateValue, setDateValue] = useState<Dayjs | null>(
        registrationStartDate ? dayjs(registrationStartDate) : null
    );
    const [dateSaving, setDateSaving] = useState(false);

    const handleToggleClick = () => {
        const newValue = !isOpen;
        setPendingToggle(newValue);

        // When opening, check constraints first
        if (newValue && (!hasMainEmail || !hasBankAccount)) {
            setConstraintsOpen(true);
            return;
        }

        setConfirmOpen(true);
    };

    const handleConfirm = async () => {
        if (pendingToggle === null) return;
        setConfirmOpen(false);
        setLoading(true);
        setError(null);

        const result = await toggleRegistration(yearId, pendingToggle);
        if (result.error) {
            setError(typeof result.error === "string" ? result.error : "Chyba");
        } else {
            setIsOpen(pendingToggle);
        }
        setLoading(false);
        setPendingToggle(null);
    };

    const handleCancel = () => {
        setConfirmOpen(false);
        setPendingToggle(null);
    };

    const handleDateChange = async (newValue: Dayjs | null) => {
        setDateValue(newValue);
        const newDateStr = newValue?.format("YYYY-MM-DD") ?? null;
        const currentDbDate = registrationStartDate
            ? new Date(registrationStartDate).toISOString().split("T")[0]
            : null;
        if (newDateStr === currentDbDate) return;

        setDateSaving(true);
        setError(null);
        const result = await updateRegistrationStartDate(yearId, newDateStr);
        if (result.error) {
            setError(typeof result.error === "string" ? result.error : "Chyba");
        }
        setDateSaving(false);
    };

    const kvRows: { label: string; value: string; negative?: boolean }[] = [
        { label: "Registrací", value: String(submissionCount) },
        { label: "Registrovaných osob", value: String(totalPeopleCount) },
        { label: "Zaplaceno", value: formatPrice(paidSum) },
        {
            label: "Nezaplaceno",
            value: formatPrice(unpaidSum),
            negative: true,
        },
    ];

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && (
                <Alert severity="error" sx={{ borderRadius: "12px" }}>
                    {error}
                </Alert>
            )}

            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={{ ...kickerSx, flex: 1 }}>
                        Stav registrace
                    </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                    <FormControlLabel
                        sx={{ mb: 2.25 }}
                        control={
                            <Switch
                                checked={isOpen}
                                onChange={handleToggleClick}
                                disabled={loading}
                                sx={switchSx}
                            />
                        }
                        label={
                            <Typography sx={{ fontWeight: 700, color: p.ink }}>
                                {isOpen
                                    ? "Registrace otevřena"
                                    : "Registrace uzavřena"}
                            </Typography>
                        }
                    />

                    <DatePicker
                        label="Datum otevření registrace"
                        value={dateValue}
                        onChange={handleDateChange}
                        disabled={dateSaving}
                        format="DD.MM.YYYY"
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                helperText:
                                    "Pokud je registrace uzavřena, na veřejných stránkách se zobrazí datum otevření",
                                sx: { ...builderFieldSx, maxWidth: 320 },
                            },
                        }}
                    />

                    <Box
                        sx={{
                            mt: 2.5,
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 190px) 1fr",
                            columnGap: 2,
                            rowGap: 1.25,
                            maxWidth: 420,
                        }}
                    >
                        {kvRows.map((row) => (
                            <Box key={row.label} sx={{ display: "contents" }}>
                                <Typography
                                    sx={{
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        color: p.ink3,
                                    }}
                                >
                                    {row.label}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily: MONO,
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        color: row.negative ? p.negInk : p.ink,
                                    }}
                                >
                                    {row.value}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            <Dialog
                open={confirmOpen}
                onClose={handleCancel}
                PaperProps={dialogPaperProps}
            >
                <DialogTitle sx={{ fontWeight: 700, color: p.ink }}>
                    {pendingToggle
                        ? "Otevřít registraci?"
                        : "Uzavřít registraci?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: p.ink2 }}>
                        {pendingToggle
                            ? "Registrace bude otevřena a návštěvníci se budou moci registrovat na veřejných stránkách."
                            : "Registrace bude uzavřena a registrační formulář nebude dostupný na veřejných stránkách."}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
                    <Button onClick={handleCancel} sx={ghostBtnSx}>
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        autoFocus
                        sx={indigoBtnSx}
                    >
                        Potvrdit
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={constraintsOpen}
                onClose={() => {
                    setConstraintsOpen(false);
                    setPendingToggle(null);
                }}
                PaperProps={dialogPaperProps}
            >
                <DialogTitle sx={{ fontWeight: 700, color: p.ink }}>
                    Nelze otevřít registraci
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: p.ink2 }}>
                        Před otevřením registrace je nutné splnit následující
                        podmínky:
                    </DialogContentText>
                    <List>
                        {!hasMainEmail && (
                            <ListItem sx={{ color: p.warnInk }}>
                                <ListItemIcon>
                                    <Warning sx={{ color: p.warnInk }} />
                                </ListItemIcon>
                                <ListItemText primary="Nastavte hlavní emailovou adresu" />
                            </ListItem>
                        )}
                        {!hasBankAccount && (
                            <ListItem sx={{ color: p.warnInk }}>
                                <ListItemIcon>
                                    <Warning sx={{ color: p.warnInk }} />
                                </ListItemIcon>
                                <ListItemText primary="Nastavte bankovní účet" />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setConstraintsOpen(false);
                            setPendingToggle(null);
                        }}
                        variant="contained"
                        sx={indigoBtnSx}
                    >
                        Zavřít
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
