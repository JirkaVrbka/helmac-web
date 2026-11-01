import {
    Container,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tooltip,
} from "@mui/material";
import { Edit, Shield, Person, SupervisorAccount } from "@mui/icons-material";
import { IconLinkButton } from "@/components/ui/link-button";
import { DashedAddButton } from "@/components/admin/dashed-add-button";
import { db } from "@/lib/db";
import { auth, requireSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserActions } from "@/components/admin/user-actions";
import { PageHeader } from "@/components/admin/page-header";
import { formatDate } from "@/lib/utils/date";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const roleBadges: Record<
    string,
    { label: string; bg: string; fg: string; icon: React.ReactNode }
> = {
    SUPER_ADMIN: {
        label: "Super Admin",
        bg: p.neg,
        fg: p.negInk,
        icon: <Shield sx={{ fontSize: 14 }} />,
    },
    ADMIN: {
        label: "Admin",
        bg: p.warnSoft,
        fg: p.warnInk,
        icon: <SupervisorAccount sx={{ fontSize: 14 }} />,
    },
    EDITOR: {
        label: "Editor",
        bg: p.field,
        fg: p.fieldInk,
        icon: <Person sx={{ fontSize: 14 }} />,
    },
};

async function getUsers() {
    return db.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            _count: {
                select: { createdNews: true },
            },
        },
    });
}

export default async function UsersPage() {
    // Check permissions
    try {
        await requireSuperAdmin();
    } catch {
        redirect("/admin");
    }

    const session = await auth();
    const users = await getUsers();

    return (
        <Container maxWidth="lg">
            <PageHeader
                breadcrumbs={[{ label: "Uživatelé" }]}
                title="Uživatelé"
            />
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    mb: 4,
                }}
            >
                <DashedAddButton href="/admin/uzivatele/novy">
                    Nový uživatel
                </DashedAddButton>
            </Box>

            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                }}
            >
                <Table
                    sx={{
                        "& .MuiTableHead-root .MuiTableCell-root": {
                            backgroundColor: p.surface2,
                            color: p.ink3,
                            textTransform: "uppercase",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            fontWeight: 700,
                            borderBottom: `1px solid ${p.line}`,
                        },
                        "& .MuiTableBody-root .MuiTableCell-root": {
                            borderBottomColor: p.lineSoft,
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Jméno</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Novinek</TableCell>
                            <TableCell>Vytvořen</TableCell>
                            <TableCell align="right">Akce</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => {
                            const roleInfo = roleBadges[user.role];
                            const isCurrentUser = session?.user?.id === user.id;

                            return (
                                <TableRow
                                    key={user.id}
                                    hover={!isCurrentUser}
                                    sx={{
                                        "&:hover": {
                                            backgroundColor: p.surface2,
                                        },
                                        ...(isCurrentUser && {
                                            backgroundColor: p.indigoSoft,
                                            "&:hover": {
                                                backgroundColor: p.indigoSoft,
                                            },
                                            "& td:first-of-type": {
                                                borderLeft: `3px solid ${p.indigo}`,
                                            },
                                        }),
                                    }}
                                >
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            {user.name}
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
                                                    Vy
                                                </Box>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
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
                                                backgroundColor: roleInfo.bg,
                                                color: roleInfo.fg,
                                            }}
                                        >
                                            {roleInfo.icon}
                                            {roleInfo.label}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            component="span"
                                            sx={{
                                                fontFamily:
                                                    "'JetBrains Mono', monospace",
                                            }}
                                        >
                                            {user._count.createdNews}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(user.createdAt)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "flex-end",
                                                gap: 0.5,
                                            }}
                                        >
                                            <Tooltip title="Upravit">
                                                <IconLinkButton
                                                    href={`/admin/uzivatele/${user.id}`}
                                                    size="small"
                                                    sx={{
                                                        color: p.ink3,
                                                        borderRadius: "8px",
                                                        "&:hover": {
                                                            color: p.indigo,
                                                            backgroundColor:
                                                                p.indigoSoft,
                                                        },
                                                    }}
                                                >
                                                    <Edit
                                                        sx={{ fontSize: 16 }}
                                                    />
                                                </IconLinkButton>
                                            </Tooltip>
                                            <UserActions
                                                userId={user.id}
                                                userName={user.name}
                                                isCurrentUser={isCurrentUser}
                                            />
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
