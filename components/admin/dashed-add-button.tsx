"use client";

import type { ReactNode } from "react";
import { ButtonBase } from "@mui/material";
import { Add } from "@mui/icons-material";
import Link from "next/link";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface DashedAddButtonProps {
    /** Link target. */
    href: string;
    children: ReactNode;
    /** Stretch to the full width of the container (e.g. inside a column foot). */
    fullWidth?: boolean;
}

/**
 * Builder-style dashed "add / create" button (admin design system).
 *
 * The canonical create affordance for admin pages — dashed indigo border that
 * fills to {@link builderPalette.indigoSoft} on hover. Because it is a Client
 * Component, it can be rendered from Server Component pages (passing `Link`
 * directly to `ButtonBase` from a Server Component throws).
 */
export function DashedAddButton({
    href,
    children,
    fullWidth = false,
}: DashedAddButtonProps) {
    return (
        <ButtonBase
            component={Link}
            href={href}
            sx={{
                width: fullWidth ? "100%" : "auto",
                py: "8px",
                px: "14px",
                backgroundColor: p.surface,
                border: `1px dashed ${p.line}`,
                borderRadius: "10px",
                color: p.indigo,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 140ms ease",
                "&:hover": {
                    borderColor: p.indigo,
                    backgroundColor: p.indigoSoft,
                },
            }}
        >
            <Add sx={{ fontSize: 16 }} />
            {children}
        </ButtonBase>
    );
}
