"use client";

import { createContext, useContext, useState } from "react";
import { Box } from "@mui/material";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface SubmissionsCountContextValue {
    displayedCount: number | null;
    setDisplayedCount: (count: number | null) => void;
}

const SubmissionsCountContext =
    createContext<SubmissionsCountContextValue | null>(null);

export function SubmissionsCountProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [displayedCount, setDisplayedCount] = useState<number | null>(null);
    return (
        <SubmissionsCountContext.Provider
            value={{ displayedCount, setDisplayedCount }}
        >
            {children}
        </SubmissionsCountContext.Provider>
    );
}

export function useSubmissionsCount(): SubmissionsCountContextValue {
    const ctx = useContext(SubmissionsCountContext);
    if (!ctx) {
        throw new Error(
            "useSubmissionsCount must be used within a SubmissionsCountProvider"
        );
    }
    return ctx;
}

export function SubmissionsCountChip({ total }: { total: number }) {
    const { displayedCount } = useSubmissionsCount();
    let label: string;
    if (displayedCount != null && displayedCount < total) {
        label =
            displayedCount === 0
                ? `Žádná z ${total} registrací`
                : `splňuje ${displayedCount} z ${total} registrací`;
    } else {
        label = `${total} registrací`;
    }
    return (
        <Box
            component="span"
            sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: p.ink2,
                backgroundColor: p.surface3,
                px: "11px",
                py: "5px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </Box>
    );
}
