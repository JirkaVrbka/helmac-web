"use client";

import { Box, Typography, ButtonBase } from "@mui/material";
import { Add } from "@mui/icons-material";
import type {
    FormField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import type { EmailConditionalSection } from "@/lib/types/email-sections";
import { SectionTokens } from "./section-tokens";
import { builderPalette as p } from "./palette";

export const BASE_SECTION_ID = "__base__";

export type RailItem =
    | { kind: "base"; id: typeof BASE_SECTION_ID; body: string }
    | { kind: "section"; id: string; section: EmailConditionalSection };

interface SectionRailProps {
    items: RailItem[];
    activeId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    availableFields: FormField[];
    pricingDefinitions?: PricingDefinition[];
}

function stripHtmlPreview(html: string): string {
    if (!html) return "";
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function formatIndex(i: number): string {
    return String(i + 1).padStart(2, "0");
}

export function SectionRail({
    items,
    activeId,
    onSelect,
    onAdd,
    availableFields,
    pricingDefinitions = [],
}: SectionRailProps) {
    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minHeight: 0,
            }}
        >
            {/* head */}
            <Box
                sx={{
                    px: 2,
                    py: 1.75,
                    borderBottom: `1px solid ${p.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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
                    Sekce
                </Typography>
                <Box
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
            </Box>

            {/* body */}
            <Box sx={{ flex: 1, overflowY: "auto", p: "8px" }}>
                {items.map((item, idx) => {
                    const isActive = activeId === item.id;
                    const body =
                        item.kind === "base" ? item.body : item.section.body;
                    const preview = stripHtmlPreview(body);

                    return (
                        <ButtonBase
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            focusRipple
                            sx={{
                                width: "100%",
                                justifyContent: "flex-start",
                                textAlign: "left",
                                display: "flex",
                                gap: "10px",
                                p: "12px 12px 12px 16px",
                                borderRadius: "10px",
                                mb: "2px",
                                transition: "background 140ms ease",
                                background: isActive
                                    ? `linear-gradient(90deg, ${p.indigoSoft} 0%, ${p.indigoSoft} 100%)`
                                    : "transparent",
                                boxShadow: isActive
                                    ? `inset 3px 0 0 ${p.indigo}`
                                    : "none",
                                "&:hover": isActive
                                    ? undefined
                                    : { backgroundColor: p.surface2 },
                            }}
                        >
                            {/* number badge */}
                            <Box
                                sx={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: isActive ? "white" : p.ink3,
                                    backgroundColor: isActive
                                        ? p.indigo
                                        : p.surface3,
                                    width: 22,
                                    height: 22,
                                    borderRadius: "6px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    mt: "1px",
                                }}
                            >
                                {formatIndex(idx)}
                            </Box>

                            {/* main */}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box sx={{ mb: "6px" }}>
                                    {item.kind === "base" ? (
                                        <SectionTokens
                                            rules={[]}
                                            availableFields={availableFields}
                                            pricingDefinitions={
                                                pricingDefinitions
                                            }
                                            baseLabel="Základní text"
                                        />
                                    ) : (
                                        <SectionTokens
                                            rules={item.section.condition.rules}
                                            availableFields={availableFields}
                                            pricingDefinitions={
                                                pricingDefinitions
                                            }
                                        />
                                    )}
                                </Box>
                                <Typography
                                    sx={{
                                        fontSize: 12.5,
                                        color: isActive ? p.ink : p.ink2,
                                        lineHeight: 1.45,
                                        overflow: "hidden",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                    }}
                                >
                                    {preview || "(prázdný text)"}
                                </Typography>
                            </Box>
                        </ButtonBase>
                    );
                })}
            </Box>

            {/* foot */}
            <Box
                sx={{
                    p: "10px",
                    borderTop: `1px solid ${p.line}`,
                    backgroundColor: p.surface2,
                }}
            >
                <ButtonBase
                    onClick={onAdd}
                    sx={{
                        width: "100%",
                        py: "10px",
                        px: "12px",
                        backgroundColor: "white",
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
                    Přidat sekci
                </ButtonBase>
            </Box>
        </Box>
    );
}
