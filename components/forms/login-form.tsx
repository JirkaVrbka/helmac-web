"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Box, Button, TextField, Alert, CircularProgress } from "@mui/material";
import { login } from "@/lib/actions/auth";
import { builderFieldSx } from "@/components/admin/builder-field-sx";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={pending}
            sx={{
                mt: 3,
                mb: 2,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "10px",
                backgroundColor: p.indigo,
                color: p.surface,
                boxShadow: "none",
                "&:hover": {
                    backgroundColor: "#4338ca",
                    boxShadow: "none",
                },
            }}
        >
            {pending ? (
                <CircularProgress size={24} color="inherit" />
            ) : (
                "Přihlásit se"
            )}
        </Button>
    );
}

export function LoginForm() {
    const [state, formAction] = useActionState(login, null);

    return (
        <Box component="form" action={formAction} sx={{ mt: 1, width: "100%" }}>
            {state?.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {state.error}
                </Alert>
            )}

            <TextField
                margin="normal"
                required
                fullWidth
                size="small"
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                sx={builderFieldSx}
            />

            <TextField
                margin="normal"
                required
                fullWidth
                size="small"
                name="password"
                label="Heslo"
                type="password"
                id="password"
                autoComplete="current-password"
                sx={builderFieldSx}
            />

            <SubmitButton />
        </Box>
    );
}
