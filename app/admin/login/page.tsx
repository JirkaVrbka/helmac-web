import { Container, Box, Typography } from "@mui/material";
import { LoginForm } from "@/components/forms/login-form";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

export default function LoginPage() {
    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        backgroundColor: p.surface,
                        border: `1px solid ${p.line}`,
                        borderRadius: "14px",
                        overflow: "hidden",
                        p: 4,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.75,
                    }}
                >
                    <Typography
                        component="h1"
                        sx={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: p.ink,
                        }}
                    >
                        Helmac Admin
                    </Typography>
                    <Typography sx={{ fontSize: "0.9rem", color: p.ink3 }}>
                        Prihlaste se do administrace
                    </Typography>
                    <LoginForm />
                </Box>
            </Box>
        </Container>
    );
}
