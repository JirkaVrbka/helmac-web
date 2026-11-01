"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    MenuItem,
    Typography,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import { createUser, updateUser, UserActionState } from "@/lib/actions/users";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface UserFormProps {
    mode: "create" | "edit";
    userId?: string;
    defaultValues?: {
        email?: string;
        name?: string;
        role?: string;
    };
}

const roles = [
    {
        value: "EDITOR",
        label: "Editor",
        description: "Může upravovat obsah stránek a novinek",
    },
    {
        value: "ADMIN",
        label: "Admin",
        description: "Může spravovat ročníky, stránky, novinky a galerie",
    },
    {
        value: "SUPER_ADMIN",
        label: "Super Admin",
        description: "Plný přístup včetně správy uživatelů",
    },
];

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="contained"
            disabled={pending}
            disableElevation
            sx={{
                borderRadius: "10px",
                backgroundColor: p.indigo,
                "&:hover": { backgroundColor: "#4338ca" },
            }}
            startIcon={
                pending ? (
                    <CircularProgress size={20} color="inherit" />
                ) : (
                    <Save />
                )
            }
        >
            {pending
                ? "Ukládám..."
                : mode === "create"
                  ? "Vytvořit uživatele"
                  : "Uložit změny"}
        </Button>
    );
}

export function UserForm({ mode, userId, defaultValues }: UserFormProps) {
    const action =
        mode === "create"
            ? createUser
            : updateUser.bind(null, userId as string);

    const [state, formAction] = useActionState<UserActionState, FormData>(
        action,
        null
    );

    return (
        <Box
            component="form"
            action={formAction}
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: `1px solid ${p.line}`,
                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                }}
            >
                <Typography
                    sx={{
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: p.ink3,
                    }}
                >
                    {mode === "create" ? "Nový uživatel" : "Upravit uživatele"}
                </Typography>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2.5,
                    p: 2.5,
                }}
            >
                {state?.error?._form && (
                    <Alert severity="error">{state.error._form[0]}</Alert>
                )}

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                        },
                        gap: 2.5,
                    }}
                >
                    <TextField
                        required
                        fullWidth
                        size="small"
                        id="name"
                        name="name"
                        label="Jméno"
                        defaultValue={defaultValues?.name || ""}
                        error={!!state?.error?.name}
                        helperText={state?.error?.name?.[0]}
                        sx={builderFieldSx}
                    />

                    <TextField
                        required
                        fullWidth
                        size="small"
                        id="email"
                        name="email"
                        label="Email"
                        type="email"
                        defaultValue={defaultValues?.email || ""}
                        error={!!state?.error?.email}
                        helperText={state?.error?.email?.[0]}
                        sx={builderFieldSx}
                    />
                </Box>

                <TextField
                    select
                    required
                    fullWidth
                    size="small"
                    id="role"
                    name="role"
                    label="Role"
                    defaultValue={defaultValues?.role || "EDITOR"}
                    error={!!state?.error?.role}
                    helperText={state?.error?.role?.[0]}
                    sx={builderFieldSx}
                >
                    {roles.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                            <Box>
                                <Typography>{role.label}</Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: p.ink3 }}
                                >
                                    {role.description}
                                </Typography>
                            </Box>
                        </MenuItem>
                    ))}
                </TextField>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                        },
                        gap: 2.5,
                    }}
                >
                    <TextField
                        required={mode === "create"}
                        fullWidth
                        size="small"
                        id="password"
                        name="password"
                        label={mode === "create" ? "Heslo" : "Nove heslo"}
                        type="password"
                        error={!!state?.error?.password}
                        helperText={
                            state?.error?.password?.[0] ||
                            (mode === "edit"
                                ? "Ponechte prázdné pro zachování stávajícího hesla"
                                : "Minimalne 8 znaku")
                        }
                        sx={builderFieldSx}
                    />

                    <TextField
                        required={mode === "create"}
                        fullWidth
                        size="small"
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Potvrzeni hesla"
                        type="password"
                        error={!!state?.error?.confirmPassword}
                        helperText={state?.error?.confirmPassword?.[0]}
                        sx={builderFieldSx}
                    />
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    px: 2.5,
                    py: 1.5,
                    borderTop: `1px solid ${p.line}`,
                    backgroundColor: p.surface2,
                }}
            >
                <SubmitButton mode={mode} />
                <LinkButton
                    href="/admin/uzivatele"
                    sx={{
                        color: p.ink2,
                        borderRadius: "10px",
                        border: `1px solid ${p.line}`,
                        backgroundColor: p.surface,
                        "&:hover": {
                            borderColor: p.ink3,
                            backgroundColor: p.surface2,
                        },
                    }}
                >
                    Zrušit
                </LinkButton>
            </Box>
        </Box>
    );
}
