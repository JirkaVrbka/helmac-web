import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { HowToReg } from "@mui/icons-material";
import type {
    InputField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import type { V2OptionCountsResult } from "@/lib/services/v2";
import { getFieldOptionValues } from "@/lib/utils/pricing";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface AttendanceStatsProps {
    totalPeople: number;
    attendingPeople: number;
    totalCounts: V2OptionCountsResult;
    attendingCounts: V2OptionCountsResult;
    fields: InputField[];
    pricingDefinitions: PricingDefinition[];
}

// Pane: white surface, 1px border, 14px radius (admin design system).
const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
};

const paneHeadSx = {
    px: 2.5,
    py: 1.5,
    borderBottom: `1px solid ${p.line}`,
    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
};

// Kicker label — the signature section-header treatment (admin design system).
const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: p.ink3,
};

const tableSx = {
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
};

// Monospace treatment for numeric atoms (admin design system).
const monoSx = {
    fontFamily: "'JetBrains Mono', monospace",
    color: p.ink,
};

export function AttendanceStats({
    totalPeople,
    attendingPeople,
    totalCounts,
    attendingCounts,
    fields,
    pricingDefinitions,
}: AttendanceStatsProps) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
                sx={{
                    ...paneSx,
                    p: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        backgroundColor: p.indigoSoft,
                        color: p.indigo,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <HowToReg sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                    <Typography
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "1.7rem",
                            fontWeight: 700,
                            lineHeight: 1.1,
                            color: p.ink,
                        }}
                    >
                        {attendingPeople} / {totalPeople}
                    </Typography>
                    <Typography sx={{ fontSize: "0.8rem", color: p.ink2 }}>
                        účastníků přijelo
                    </Typography>
                </Box>
            </Box>

            {fields.length === 0 ? (
                <Box
                    sx={{
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        py: 4,
                        textAlign: "center",
                        color: p.ink3,
                    }}
                >
                    <Typography sx={{ color: p.ink3 }}>
                        Formulář zatím nemá žádné položky.
                    </Typography>
                </Box>
            ) : (
                fields.map((field) => {
                    const options = getFieldOptionValues(
                        field,
                        pricingDefinitions
                    );
                    if (options.length === 0) return null;

                    const fieldTotal = totalCounts[field.name]?.counts ?? {};
                    const fieldAttending =
                        attendingCounts[field.name]?.counts ?? {};

                    return (
                        <Box key={field.name} sx={paneSx}>
                            <Box sx={paneHeadSx}>
                                <Typography sx={kickerSx}>
                                    {field.label}
                                </Typography>
                            </Box>
                            <TableContainer>
                                <Table size="small" sx={tableSx}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Položka</TableCell>
                                            <TableCell align="right">
                                                Přihlášeno
                                            </TableCell>
                                            <TableCell align="right">
                                                Přijelo
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {options.map((option) => (
                                            <TableRow key={option}>
                                                <TableCell>{option}</TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={monoSx}
                                                >
                                                    {fieldTotal[option] ?? 0}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={monoSx}
                                                >
                                                    {fieldAttending[option] ??
                                                        0}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    );
                })
            )}
        </Box>
    );
}
