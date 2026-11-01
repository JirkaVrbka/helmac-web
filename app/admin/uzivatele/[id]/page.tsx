import { Container, Typography, Box } from "@mui/material";
import { Shield, Person, SupervisorAccount } from "@mui/icons-material";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth, requireSuperAdmin } from "@/lib/auth";
import { UserForm } from "@/components/forms/user-form";
import { PageHeader } from "@/components/admin/page-header";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface EditUserPageProps {
    params: Promise<{ id: string }>;
}

const roleIcons: Record<string, React.ReactNode> = {
    SUPER_ADMIN: <Shield sx={{ fontSize: 14 }} />,
    ADMIN: <SupervisorAccount sx={{ fontSize: 14 }} />,
    EDITOR: <Person sx={{ fontSize: 14 }} />,
};

const roleBadgeColors: Record<string, { bg: string; fg: string }> = {
    SUPER_ADMIN: { bg: p.neg, fg: p.negInk },
    ADMIN: { bg: p.warnSoft, fg: p.warnInk },
    EDITOR: { bg: p.field, fg: p.fieldInk },
};

async function getUser(id: string) {
    return db.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
        },
    });
}

export default async function EditUserPage({ params }: EditUserPageProps) {
    // Check permissions
    try {
        await requireSuperAdmin();
    } catch {
        redirect("/admin");
    }

    const { id } = await params;
    const [user, session] = await Promise.all([getUser(id), auth()]);

    if (!user) {
        notFound();
    }

    const isCurrentUser = session?.user?.id === user.id;

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[
                    { label: "Uzivatele", href: "/admin/uzivatele" },
                    { label: user.name },
                ]}
                title="Upravit uzivatele"
            />
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 1,
                    }}
                >
                    <Box
                        component="span"
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            px: "10px",
                            py: "3px",
                            borderRadius: "20px",
                            backgroundColor: roleBadgeColors[user.role].bg,
                            color: roleBadgeColors[user.role].fg,
                        }}
                    >
                        {roleIcons[user.role]}
                        {user.role.replace("_", " ")}
                    </Box>
                    {isCurrentUser && (
                        <Box
                            component="span"
                            sx={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                border: `1px solid ${p.line}`,
                                borderRadius: "12px",
                                px: "9px",
                                py: "1px",
                                color: p.ink2,
                            }}
                        >
                            Vas ucet
                        </Box>
                    )}
                </Box>
                <Typography sx={{ color: p.ink2 }}>{user.name}</Typography>
            </Box>

            <UserForm
                mode="edit"
                userId={user.id}
                defaultValues={{
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }}
            />
        </Container>
    );
}
