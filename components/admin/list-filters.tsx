"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Box,
    TextField,
    Select,
    MenuItem,
    InputAdornment,
    FormControl,
    InputLabel,
} from "@mui/material";
import { Search, Clear } from "@mui/icons-material";
import { useDebouncedCallback } from "use-debounce";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface Year {
    id: string;
    year: number;
    title: string;
}

interface ListFiltersProps {
    showYearFilter?: boolean;
    showStatusFilter?: boolean;
    years?: Year[];
    searchPlaceholder?: string;
}

export function ListFilters({
    showYearFilter = false,
    showStatusFilter = false,
    years = [],
    searchPlaceholder = "Hledat...",
}: ListFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlSearch = searchParams.get("q") ?? "";
    const [searchValue, setSearchValue] = useState(urlSearch);
    const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);

    // Sync from URL → local state (e.g., browser back/forward)
    if (urlSearch !== prevUrlSearch) {
        setPrevUrlSearch(urlSearch);
        setSearchValue(urlSearch);
    }

    const updateFilter = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            router.push(`?${params.toString()}`);
        },
        [router, searchParams]
    );

    const debouncedSearch = useDebouncedCallback((value: string) => {
        updateFilter("q", value);
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        debouncedSearch(value);
    };

    const clearSearch = () => {
        setSearchValue("");
        updateFilter("q", "");
    };

    return (
        <Box
            sx={{
                display: "flex",
                gap: 2,
                mb: 3,
                flexWrap: "wrap",
            }}
        >
            <TextField
                placeholder={searchPlaceholder}
                size="small"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search color="action" />
                        </InputAdornment>
                    ),
                    endAdornment: searchValue ? (
                        <InputAdornment position="end">
                            <Clear
                                sx={{ cursor: "pointer", fontSize: 20 }}
                                onClick={clearSearch}
                            />
                        </InputAdornment>
                    ) : null,
                }}
                sx={{
                    flex: { xs: "1 1 100%", sm: "0 1 auto" },
                    minWidth: { xs: "100%", sm: 250 },
                    ...builderFieldSx,
                }}
            />

            {showYearFilter && years.length > 0 && (
                <FormControl
                    size="small"
                    sx={{
                        flex: { xs: "1 1 45%", sm: "0 1 auto" },
                        minWidth: { xs: "45%", sm: 150 },
                        ...builderFieldSx,
                    }}
                >
                    <InputLabel>Rocnik</InputLabel>
                    <Select
                        label="Rocnik"
                        value={searchParams.get("yearId") ?? ""}
                        onChange={(e) => updateFilter("yearId", e.target.value)}
                    >
                        <MenuItem value="">Všechny rocniky</MenuItem>
                        {years.map((year) => (
                            <MenuItem key={year.id} value={year.id}>
                                {year.year} - {year.title}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {showStatusFilter && (
                <FormControl
                    size="small"
                    sx={{
                        flex: { xs: "1 1 45%", sm: "0 1 auto" },
                        minWidth: { xs: "45%", sm: 140 },
                        ...builderFieldSx,
                    }}
                >
                    <InputLabel>Stav</InputLabel>
                    <Select
                        label="Stav"
                        value={searchParams.get("status") ?? ""}
                        onChange={(e) => updateFilter("status", e.target.value)}
                    >
                        <MenuItem value="">Všechny</MenuItem>
                        <MenuItem value="published">Publikovane</MenuItem>
                        <MenuItem value="draft">Skryte</MenuItem>
                    </Select>
                </FormControl>
            )}
        </Box>
    );
}
