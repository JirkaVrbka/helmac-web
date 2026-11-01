import {
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Typography,
    Box,
} from "@mui/material";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { ListFilters } from "@/components/admin/list-filters";
import { PublicUserActions } from "@/components/admin/public-user-actions";
import { formatDate } from "@/lib/utils/date";
import { Prisma } from "@prisma/client";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface PageProps {
    searchParams: Promise<{ q?: string }>;
}

// Pane: white surface, 1px border, 14px radius (admin design system).
const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
};

// Status badge: round pill with a leading dot, color-coded by meaning.
function StatusBadge({
    label,
    bg,
    fg,
}: {
    label: string;
    bg: string;
    fg: string;
}) {
    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                px: "9px",
                py: "3px",
                borderRadius: "20px",
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: bg,
                color: fg,
            }}
        >
            <Box
                component="span"
                sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "currentColor",
                }}
            />
            {label}
        </Box>
    );
}

async function getPublicUsers(filters: { q?: string }) {
    const where: Prisma.PublicUserWhereInput = {};

    if (filters.q) {
        where.email = { contains: filters.q, mode: "insensitive" };
    }

    return db.publicUser.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            emailVerified: true,
            createdAt: true,
            _count: {
                select: {
                    registrations: { where: { isTest: false } },
                },
            },
            registrations: {
                where: { isTest: false },
                select: {
                    year: { select: { year: true } },
                },
                orderBy: { year: { year: "asc" } },
            },
        },
    });
}

export default async function PublicUsersPage({ searchParams }: PageProps) {
    try {
        await requireAdmin();
    } catch {
        redirect("/admin");
    }

    const params = await searchParams;
    const users = await getPublicUsers(params);

    return (
        <Container maxWidth="lg">
            <PageHeader
                breadcrumbs={[{ label: "Účastníci" }]}
                title="Účastníci"
            />

            <ListFilters searchPlaceholder="Hledat účastníky..." />

            <Box sx={paneSx}>
                <TableContainer>
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
                                color: p.ink,
                            },
                            "& .MuiTableBody-root .MuiTableRow-root:hover": {
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Email</TableCell>
                                <TableCell>Ověřen</TableCell>
                                <TableCell>Registrací</TableCell>
                                <TableCell>Vytvořen</TableCell>
                                <TableCell>Akce</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography
                                            variant="body2"
                                            sx={{ py: 4, color: p.ink3 }}
                                        >
                                            {params.q
                                                ? "Žádní účastníci neodpovídají filtru."
                                                : "Zatím žádní účastníci"}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.emailVerified ? (
                                                <StatusBadge
                                                    label="Ano"
                                                    bg={p.value}
                                                    fg={p.valueInk}
                                                />
                                            ) : (
                                                <StatusBadge
                                                    label="Ne"
                                                    bg={p.surface3}
                                                    fg={p.ink2}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.registrations.length > 0 ? (
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 0.75,
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    {[
                                                        ...new Set(
                                                            user.registrations.map(
                                                                (r) =>
                                                                    r.year.year
                                                            )
                                                        ),
                                                    ].map((year) => (
                                                        <Chip
                                                            key={year}
                                                            label={year}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                height: 22,
                                                                fontSize:
                                                                    "0.72rem",
                                                                fontWeight: 600,
                                                                borderRadius:
                                                                    "12px",
                                                                borderColor:
                                                                    p.line,
                                                                color: p.ink2,
                                                                backgroundColor:
                                                                    p.surface,
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Box
                                                    component="span"
                                                    sx={{ color: p.ink3 }}
                                                >
                                                    —
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ color: p.ink2 }}>
                                            {formatDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <PublicUserActions
                                                userId={user.id}
                                                userEmail={user.email}
                                                registrationCount={
                                                    user._count.registrations
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Container>
    );
}
