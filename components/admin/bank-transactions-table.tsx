"use client";

import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { useState } from "react";
import Link from "next/link";
import type { BankTransactionMatchStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils/date";
import { PairTransactionButton } from "@/components/admin/pair-transaction-button";
import type { UnpaidOrderOption } from "@/lib/services/v2";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface TransactionRow {
    id: string;
    date: string;
    amount: number;
    currency: string;
    variableSymbol: string | null;
    counterpartAccount: string | null;
    counterpartName: string | null;
    matchStatus: BankTransactionMatchStatus;
    orderId: string | null;
    legacySubmissionId: string | null;
}

interface BankTransactionsTableProps {
    transactions: TransactionRow[];
    yearId: string;
    unpaidOrders?: UnpaidOrderOption[];
    showFilter?: boolean;
}

const statusConfig: Record<
    BankTransactionMatchStatus,
    { label: string; bg: string; fg: string }
> = {
    UNPROCESSED: { label: "Nezpracováno", bg: p.surface3, fg: p.ink2 },
    MATCHED: { label: "Spárováno", bg: p.value, fg: p.valueInk },
    PARTIAL_PAYMENT: {
        label: "Částečná platba",
        bg: p.warnSoft,
        fg: p.warnInk,
    },
    OVERPAYMENT: { label: "Přeplatek", bg: p.value, fg: p.valueInk },
    NO_VARIABLE_SYMBOL: { label: "Bez VS", bg: p.surface3, fg: p.ink2 },
    UNKNOWN_VS: { label: "Neznámý VS", bg: p.neg, fg: p.negInk },
    ALREADY_PAID: { label: "Již zaplaceno", bg: p.field, fg: p.fieldInk },
    OUTGOING: { label: "Odchozí", bg: p.surface3, fg: p.ink2 },
};

const PAIRABLE_STATUSES = new Set<BankTransactionMatchStatus>([
    "UNKNOWN_VS",
    "NO_VARIABLE_SYMBOL",
]);

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
                fontWeight: 600,
                backgroundColor: bg,
                color: fg,
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

export function BankTransactionsTable({
    transactions,
    yearId,
    unpaidOrders,
    showFilter = false,
}: BankTransactionsTableProps) {
    const [filter, setFilter] = useState<string>("ALL");

    const filtered =
        filter === "ALL"
            ? transactions
            : transactions.filter((tx) => tx.matchStatus === filter);

    if (transactions.length === 0) {
        return (
            <Typography variant="body2" sx={{ color: p.ink3 }}>
                Zatím žádné transakce.
            </Typography>
        );
    }

    return (
        <Box>
            {showFilter && (
                <FormControl
                    size="small"
                    sx={{ mb: 2, minWidth: 200, ...builderFieldSx }}
                >
                    <InputLabel>Filtr stavu</InputLabel>
                    <Select
                        value={filter}
                        label="Filtr stavu"
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <MenuItem value="ALL">Vše</MenuItem>
                        {Object.entries(statusConfig).map(
                            ([key, { label }]) => (
                                <MenuItem key={key} value={key}>
                                    {label}
                                </MenuItem>
                            )
                        )}
                    </Select>
                </FormControl>
            )}

            <TableContainer
                sx={{
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    overflow: "hidden",
                }}
            >
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
                        },
                        "& .MuiTableBody-root .MuiTableRow-root:hover": {
                            backgroundColor: p.surface2,
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Datum</TableCell>
                            <TableCell align="right">Částka</TableCell>
                            <TableCell>VS</TableCell>
                            <TableCell>Odesílatel</TableCell>
                            <TableCell>Stav</TableCell>
                            <TableCell>Registrace</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((tx) => {
                            const config = statusConfig[tx.matchStatus];
                            return (
                                <TableRow key={tx.id}>
                                    <TableCell sx={{ color: p.ink }}>
                                        {formatDate(tx.date)}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color:
                                                tx.amount < 0
                                                    ? p.negInk
                                                    : p.valueInk,
                                            fontWeight: 600,
                                            fontFamily:
                                                "'JetBrains Mono', monospace",
                                        }}
                                    >
                                        {tx.amount.toLocaleString("cs-CZ")}{" "}
                                        {tx.currency}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: p.ink,
                                            fontFamily:
                                                "'JetBrains Mono', monospace",
                                        }}
                                    >
                                        {tx.variableSymbol || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{ maxWidth: 200, color: p.ink }}
                                        >
                                            {tx.counterpartName ||
                                                tx.counterpartAccount ||
                                                "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            label={config.label}
                                            bg={config.bg}
                                            fg={config.fg}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {tx.orderId ? (
                                            <Box
                                                component={Link}
                                                href={`/admin/rocniky/${yearId}/registrace/${tx.legacySubmissionId ?? tx.orderId}`}
                                                sx={{
                                                    color: p.indigo,
                                                    fontWeight: 600,
                                                    textDecoration: "none",
                                                    "&:hover": {
                                                        textDecoration:
                                                            "underline",
                                                    },
                                                }}
                                            >
                                                Detail
                                            </Box>
                                        ) : unpaidOrders &&
                                          PAIRABLE_STATUSES.has(
                                              tx.matchStatus
                                          ) ? (
                                            <PairTransactionButton
                                                transactionId={tx.id}
                                                unpaidOrders={unpaidOrders}
                                            />
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
