"use client";

import { useState, useTransition } from "react";
import { Alert, Box, FormControlLabel, Switch } from "@mui/material";
import { toggleConfirmationEmail } from "@/lib/actions/years";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

type ToggleAction = (
    yearId: string,
    enabled: boolean
) => Promise<{ success?: boolean; error?: string }>;

interface EmailToggleProps {
    yearId: string;
    initialEnabled: boolean;
    hasTemplate: boolean;
    toggleAction?: ToggleAction;
    label?: string;
}

export function EmailToggle({
    yearId,
    initialEnabled,
    toggleAction = toggleConfirmationEmail,
    label = "Odesílat potvrzovací email po registraci",
}: EmailToggleProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (checked: boolean) => {
        setError(null);
        startTransition(async () => {
            const result = await toggleAction(yearId, checked);
            if (result && "error" in result && result.error) {
                setError(
                    typeof result.error === "string"
                        ? result.error
                        : "Nepodařilo se změnit stav"
                );
            } else {
                setEnabled(checked);
            }
        });
    };

    return (
        <Box>
            <FormControlLabel
                control={
                    <Switch
                        checked={enabled}
                        onChange={(e) => handleToggle(e.target.checked)}
                        disabled={isPending}
                        sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": {
                                color: p.indigo,
                            },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                { backgroundColor: p.indigo },
                        }}
                    />
                }
                label={label}
                sx={{ "& .MuiFormControlLabel-label": { color: p.ink2 } }}
            />
            {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                    {error}
                </Alert>
            )}
        </Box>
    );
}
