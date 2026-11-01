"use client";

import { useState } from "react";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Alert,
    FormControlLabel,
    Switch,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import {
    updateSubmissionStatus,
    toggleSubmissionPayment,
    deleteSubmission,
} from "@/lib/actions/registration-submissions";
import type { RegistrationStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const STATUS_OPTIONS: { value: RegistrationStatus; label: string }[] = [
    { value: "PENDING", label: "Čeká" },
    { value: "CONFIRMED", label: "Potvrzeno" },
    { value: "WAITLIST", label: "Čekací listina" },
    { value: "CANCELLED", label: "Zrušeno" },
    { value: "REJECTED", label: "Zamítnuto" },
];

interface SubmissionActionsProps {
    submissionId: string;
    yearId: string;
    status: RegistrationStatus;
    isPaid: boolean;
}

export function SubmissionActions({
    submissionId,
    yearId,
    status,
    isPaid,
}: SubmissionActionsProps) {
    const router = useRouter();
    const [currentStatus, setCurrentStatus] = useState(status);
    const [currentPaid, setCurrentPaid] = useState(isPaid);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const handleStatusChange = async (newStatus: RegistrationStatus) => {
        setLoading(true);
        setError(null);
        const result = await updateSubmissionStatus(submissionId, newStatus);
        if (result.error) {
            setError(result.error);
        } else {
            setCurrentStatus(newStatus);
        }
        setLoading(false);
    };

    const handlePaymentToggle = async () => {
        setLoading(true);
        setError(null);
        const newPaid = !currentPaid;
        const result = await toggleSubmissionPayment(submissionId, newPaid);
        if (result.error) {
            setError(result.error);
        } else {
            setCurrentPaid(newPaid);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        setDeleteOpen(false);
        setLoading(true);
        const result = await deleteSubmission(submissionId);
        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push(`/admin/rocniky/${yearId}/registrace`);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <FormControl size="small" sx={{ minWidth: 200, ...builderFieldSx }}>
                <InputLabel>Stav</InputLabel>
                <Select
                    value={currentStatus}
                    onChange={(e) =>
                        handleStatusChange(e.target.value as RegistrationStatus)
                    }
                    label="Stav"
                    disabled={loading}
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControlLabel
                control={
                    <Switch
                        checked={currentPaid}
                        onChange={handlePaymentToggle}
                        disabled={loading}
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
                label={currentPaid ? "Zaplaceno" : "Nezaplaceno"}
                sx={{ "& .MuiFormControlLabel-label": { color: p.ink2 } }}
            />

            <Button
                startIcon={<Delete />}
                onClick={() => setDeleteOpen(true)}
                disabled={loading}
                size="small"
                sx={{
                    alignSelf: "flex-start",
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    color: p.negInk,
                    borderRadius: "10px",
                    boxShadow: "none",
                    "&:hover": {
                        backgroundColor: p.neg,
                        borderColor: p.negInk,
                        boxShadow: "none",
                    },
                }}
            >
                Smazat registraci
            </Button>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat registraci?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tato akce je nevratná. Registrace bude trvale
                        odstraněna.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteOpen(false)}
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
                        onClick={handleDelete}
                        variant="contained"
                        disableElevation
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
                        Smazat
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
