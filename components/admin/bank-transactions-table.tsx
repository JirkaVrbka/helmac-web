"use client";

import {
    Box,
    Button,
    FormControl,
    FormControlLabel,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { Clear, Search } from "@mui/icons-material";
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
    userMessage: string | null;
    matchStatus: BankTransactionMatchStatus;
    orderId: string | null;
    submissionId: string | null;
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

// Builder-palette switch: track p.surface3 off / p.indigo on, white knob.
const builderSwitchSx = {
    "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: p.indigo,
        opacity: 1,
    },
    "& .MuiSwitch-track": { backgroundColor: p.surface3, opacity: 1 },
    "& .MuiSwitch-thumb": { color: "#fff" },
};

const switchLabelSx = {
    m: 0,
    "& .MuiFormControlLabel-label": {
        fontSize: 13,
        fontWeight: 600,
        color: p.ink2,
    },
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
    const [nameQuery, setNameQuery] = useState("");
    const [amountFrom, setAmountFrom] = useState("");
    const [amountTo, setAmountTo] = useState("");
    const [withoutVs, setWithoutVs] = useState(false);
    const [notPaired, setNotPaired] = useState(false);

    const nameNeedle = nameQuery.trim().toLowerCase();
    const fromBound = amountFrom.trim() === "" ? null : Number(amountFrom);
    const toBound = amountTo.trim() === "" ? null : Number(amountTo);

    // All filters combine with AND; in-memory over already-loaded rows.
    const filtered = transactions.filter((tx) => {
        // R7: status dropdown
        if (filter !== "ALL" && tx.matchStatus !== filter) {
            return false;
        }

        // R1: fulltext search over name / account / message / VS
        // (case-insensitive substring)
        if (nameNeedle !== "") {
            const haystacks = [
                tx.counterpartName,
                tx.counterpartAccount,
                tx.userMessage,
                tx.variableSymbol,
            ];
            const matches = haystacks.some(
                (value) =>
                    value != null && value.toLowerCase().includes(nameNeedle)
            );
            if (!matches) {
                return false;
            }
        }

        // R2/R3: signed, inclusive amount bounds
        if (fromBound !== null && !Number.isNaN(fromBound)) {
            if (tx.amount < fromBound) {
                return false;
            }
        }
        if (toBound !== null && !Number.isNaN(toBound)) {
            if (tx.amount > toBound) {
                return false;
            }
        }

        // R5: "without VS" keeps only rows with no variable symbol
        if (withoutVs) {
            if (tx.variableSymbol != null && tx.variableSymbol.trim() !== "") {
                return false;
            }
        }

        // R6: not paired = neither order nor submission
        if (notPaired) {
            if (tx.orderId !== null || tx.submissionId !== null) {
                return false;
            }
        }

        return true;
    });

    const anyFilterActive =
        filter !== "ALL" ||
        nameQuery.trim() !== "" ||
        amountFrom.trim() !== "" ||
        amountTo.trim() !== "" ||
        withoutVs ||
        notPaired;

    const clearFilters = () => {
        setFilter("ALL");
        setNameQuery("");
        setAmountFrom("");
        setAmountTo("");
        setWithoutVs(false);
        setNotPaired(false);
    };

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
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <TextField
                        size="small"
                        label="Hledat (jméno, účet, VS, zpráva)"
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: nameQuery ? (
                                <InputAdornment position="end">
                                    <Clear
                                        sx={{
                                            cursor: "pointer",
                                            fontSize: 20,
                                        }}
                                        onClick={() => setNameQuery("")}
                                    />
                                </InputAdornment>
                            ) : null,
                        }}
                        inputProps={{ "data-testid": "tx-filter-name" }}
                        sx={{
                            flex: { xs: "1 1 100%", sm: "1 1 260px" },
                            minWidth: { xs: "100%", sm: 240 },
                            ...builderFieldSx,
                        }}
                    />

                    <TextField
                        size="small"
                        type="number"
                        label="Částka od"
                        value={amountFrom}
                        onChange={(e) => setAmountFrom(e.target.value)}
                        inputProps={{ "data-testid": "tx-filter-amount-from" }}
                        sx={{
                            flex: { xs: "1 1 45%", sm: "0 1 120px" },
                            minWidth: { xs: "45%", sm: 110 },
                            ...builderFieldSx,
                        }}
                    />

                    <TextField
                        size="small"
                        type="number"
                        label="Částka do"
                        value={amountTo}
                        onChange={(e) => setAmountTo(e.target.value)}
                        inputProps={{ "data-testid": "tx-filter-amount-to" }}
                        sx={{
                            flex: { xs: "1 1 45%", sm: "0 1 120px" },
                            minWidth: { xs: "45%", sm: 110 },
                            ...builderFieldSx,
                        }}
                    />

                    <Box data-testid="tx-filter-without-vs">
                        <FormControlLabel
                            sx={switchLabelSx}
                            label="Bez VS"
                            control={
                                <Switch
                                    checked={withoutVs}
                                    onChange={(e) =>
                                        setWithoutVs(e.target.checked)
                                    }
                                    sx={builderSwitchSx}
                                />
                            }
                        />
                    </Box>

                    <Box data-testid="tx-filter-not-paired">
                        <FormControlLabel
                            sx={switchLabelSx}
                            label="Nespárované"
                            control={
                                <Switch
                                    checked={notPaired}
                                    onChange={(e) =>
                                        setNotPaired(e.target.checked)
                                    }
                                    sx={builderSwitchSx}
                                />
                            }
                        />
                    </Box>

                    <FormControl
                        size="small"
                        sx={{ minWidth: 180, ...builderFieldSx }}
                    >
                        <InputLabel>Filtr stavu</InputLabel>
                        <Select
                            value={filter}
                            label="Filtr stavu"
                            onChange={(e) => setFilter(e.target.value)}
                            inputProps={{ "data-testid": "tx-filter-status" }}
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

                    <Box
                        data-testid="tx-filter-count"
                        component="span"
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            color: p.ink2,
                            backgroundColor: p.surface3,
                            px: "9px",
                            py: "4px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {filtered.length} z {transactions.length}
                    </Box>

                    <Button
                        data-testid="tx-filter-clear"
                        onClick={clearFilters}
                        disabled={!anyFilterActive}
                        startIcon={<Clear />}
                        sx={{
                            backgroundColor: p.surface,
                            border: `1px solid ${p.line}`,
                            color: p.ink2,
                            borderRadius: "10px",
                            px: 1.5,
                            "&:hover": {
                                backgroundColor: p.surface2,
                                borderColor: p.ink3,
                            },
                            "&.Mui-disabled": {
                                color: p.ink3,
                                borderColor: p.line,
                                backgroundColor: p.surface,
                                cursor: "default",
                            },
                        }}
                    >
                        Zrušit filtry
                    </Button>
                </Box>
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
                                <TableRow key={tx.id} data-testid="tx-row">
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
