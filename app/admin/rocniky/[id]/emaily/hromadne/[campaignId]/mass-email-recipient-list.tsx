"use client";

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const ITEM_STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; fg: string }
> = {
    SENT: { label: "Odesláno", bg: p.value, fg: p.valueInk },
    FAILED: { label: "Neúspěšné", bg: p.neg, fg: p.negInk },
    PENDING: { label: "Ve frontě", bg: p.surface3, fg: p.ink2 },
    SENDING: { label: "Ve frontě", bg: p.surface3, fg: p.ink2 },
};

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
                whiteSpace: "nowrap",
            }}
        >
            <Box
                component="span"
                sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "currentColor",
                }}
            />
            {label}
        </Box>
    );
}

interface RecipientItem {
    id: string;
    recipient: string;
    status: string;
    sentAt: string | null;
}

interface MassEmailRecipientListProps {
    items: RecipientItem[];
}

export function MassEmailRecipientList({ items }: MassEmailRecipientListProps) {
    return (
        <Accordion
            disableGutters
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px !important",
                overflow: "hidden",
                boxShadow: "none",
                "&:before": { display: "none" },
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: p.ink3 }} />}
                sx={{
                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                    "& .MuiAccordionSummary-content": {
                        alignItems: "center",
                        gap: 1.5,
                    },
                }}
            >
                <Typography
                    sx={{
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: p.ink3,
                        fontWeight: 700,
                    }}
                >
                    Příjemci
                </Typography>
                <Box
                    component="span"
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: p.ink2,
                        backgroundColor: p.surface3,
                        px: "7px",
                        py: "2px",
                        borderRadius: "6px",
                    }}
                >
                    {items.length}
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, borderTop: `1px solid ${p.line}` }}>
                <Table
                    size="small"
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
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Příjemce</TableCell>
                            <TableCell>Stav</TableCell>
                            <TableCell>Odesláno</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item) => {
                            const statusConfig = ITEM_STATUS_CONFIG[
                                item.status
                            ] ?? {
                                label: item.status,
                                bg: p.surface3,
                                fg: p.ink2,
                            };
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{item.recipient}</TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            label={statusConfig.label}
                                            bg={statusConfig.bg}
                                            fg={statusConfig.fg}
                                        />
                                    </TableCell>
                                    <TableCell>{item.sentAt ?? "—"}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </AccordionDetails>
        </Accordion>
    );
}
