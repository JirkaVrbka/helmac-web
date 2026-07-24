"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Autocomplete,
    Box,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from "@mui/material";
import { Close } from "@mui/icons-material";

interface FilterableField {
    name: string;
    label: string;
    type: string;
    options: string[];
}

interface SubmissionsFilterBarProps {
    basePath: string;
    statusFilter: string | null;
    paidFilter: boolean | null;
    testFilter: "real" | "test" | "all";
    isEditor: boolean;
    statusParam: string;
    paidParam: string;
    testParam: string;
    filterableFields?: FilterableField[];
    activeField?: string | null;
    activeValue?: string | null;
    children?: ReactNode;
}

const STATUS_OPTIONS = [
    { value: "", label: "Vše" },
    { value: "PENDING", label: "Čeká" },
    { value: "CONFIRMED", label: "Potvrzeno" },
    { value: "WAITLIST", label: "Čekací listina" },
    { value: "CANCELLED", label: "Zrušeno" },
    { value: "REJECTED", label: "Zamítnuto" },
];

const PAID_OPTIONS = [
    { value: "", label: "Vše" },
    { value: "true", label: "Zaplaceno" },
    { value: "false", label: "Nezaplaceno" },
];

const TEST_OPTIONS = [
    { value: "real", label: "Reálné" },
    { value: "test", label: "Testovací" },
    { value: "all", label: "Vše (vč. test)" },
];

export function SubmissionsFilterBar({
    basePath,
    statusFilter,
    paidFilter,
    testFilter,
    isEditor,
    statusParam,
    paidParam,
    testParam,
    filterableFields,
    activeField,
    activeValue,
    children,
}: SubmissionsFilterBarProps) {
    const router = useRouter();
    const [pendingField, setPendingField] =
        useState<FilterableField | null>(null);

    const otherParams = [
        statusParam,
        paidParam,
        testParam,
    ]
        .filter(Boolean)
        .join("&");

    const navigate = (params: string[]) => {
        const query = params.filter(Boolean).join("&");
        router.push(
            query
                ? `${basePath}?${query}`
                : basePath,
        );
    };

    const confirmedField = activeField
        ? filterableFields?.find(
              (f) => f.name === activeField,
          ) ?? null
        : null;
    const selectedField = pendingField ?? confirmedField;

    const handleFieldChange = (
        _: unknown,
        field: FilterableField | null,
    ) => {
        if (!field) {
            setPendingField(null);
            navigate([otherParams]);
            return;
        }
        if (field.options.length === 1) {
            setPendingField(null);
            navigate([
                otherParams,
                `field=${encodeURIComponent(field.name)}`,
                `value=${encodeURIComponent(field.options[0])}`,
            ]);
            return;
        }
        setPendingField(field);
    };

    const handleValueChange = (
        _: unknown,
        value: string | null,
    ) => {
        if (!selectedField || !value) return;
        setPendingField(null);
        navigate([
            otherParams,
            `field=${encodeURIComponent(selectedField.name)}`,
            `value=${encodeURIComponent(value)}`,
        ]);
    };

    const handleClearField = () => {
        setPendingField(null);
        navigate([otherParams]);
    };

    const hasActiveFieldFilter =
        confirmedField && activeValue;

    return (
        <Box sx={{ mb: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    gap: 1.5,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <FormControl
                    size="small"
                    sx={{ minWidth: 140 }}
                >
                    <InputLabel>Stav</InputLabel>
                    <Select
                        value={statusFilter ?? ""}
                        label="Stav"
                        onChange={(e) => {
                            const v = e.target.value;
                            navigate([
                                v ? `status=${v}` : "",
                                paidParam,
                                testParam,
                            ]);
                        }}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <MenuItem
                                key={o.value}
                                value={o.value}
                            >
                                {o.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl
                    size="small"
                    sx={{ minWidth: 140 }}
                >
                    <InputLabel>Platba</InputLabel>
                    <Select
                        value={
                            paidFilter === null
                                ? ""
                                : String(paidFilter)
                        }
                        label="Platba"
                        onChange={(e) => {
                            const v = e.target.value;
                            navigate([
                                statusParam,
                                v ? `paid=${v}` : "",
                                testParam,
                            ]);
                        }}
                    >
                        {PAID_OPTIONS.map((o) => (
                            <MenuItem
                                key={o.value}
                                value={o.value}
                            >
                                {o.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {!isEditor && (
                    <FormControl
                        size="small"
                        sx={{ minWidth: 140 }}
                    >
                        <InputLabel>Registrace</InputLabel>
                        <Select
                            value={testFilter}
                            label="Registrace"
                            onChange={(e) => {
                                const v = e.target.value;
                                navigate([
                                    statusParam,
                                    paidParam,
                                    v === "real"
                                        ? ""
                                        : `test=${v}`,
                                ]);
                            }}
                        >
                            {TEST_OPTIONS.map((o) => (
                                <MenuItem
                                    key={o.value}
                                    value={o.value}
                                >
                                    {o.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {filterableFields &&
                    filterableFields.length > 0 &&
                    !hasActiveFieldFilter && (
                        <Autocomplete
                            size="small"
                            options={filterableFields}
                            getOptionLabel={(f) =>
                                f.label
                            }
                            renderOption={(
                                props,
                                option,
                            ) => (
                                <li
                                    {...props}
                                    key={option.name}
                                >
                                    {option.label}
                                </li>
                            )}
                            value={selectedField}
                            onChange={handleFieldChange}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Filtrovat dle pole..."
                                />
                            )}
                            sx={{ minWidth: 200 }}
                            noOptionsText="Žádná pole"
                            isOptionEqualToValue={(
                                o,
                                v,
                            ) => o.name === v.name}
                        />
                    )}

                {filterableFields &&
                    selectedField &&
                    !hasActiveFieldFilter && (
                        <Autocomplete
                            size="small"
                            options={
                                selectedField.options
                            }
                            value={null}
                            onChange={handleValueChange}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Vyberte hodnotu..."
                                />
                            )}
                            sx={{ minWidth: 200 }}
                            noOptionsText="Žádné hodnoty"
                            openOnFocus
                        />
                    )}

                <Box sx={{ flex: 1 }} />

                {children}
            </Box>

            {hasActiveFieldFilter && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 1,
                    }}
                >
                    <Chip
                        label={`${confirmedField.label}: ${activeValue}`}
                        onDelete={handleClearField}
                        deleteIcon={<Close />}
                        color="primary"
                        size="small"
                        variant="outlined"
                    />
                </Box>
            )}
        </Box>
    );
}
