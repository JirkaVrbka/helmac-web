"use client";

import { Box, Typography } from "@mui/material";
import type { PricingSummaryData } from "@/lib/types/registration-form";
import { formatPrice } from "@/lib/utils/pricing";
import { formatDate } from "@/lib/utils/date";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface SubmissionPricingSummaryProps {
    pricingSummary: PricingSummaryData | null;
    variableSymbol: string | null;
    totalPrice: number | null;
    priceDiff?: number | null;
}

const monoSx = {
    fontFamily: "'JetBrains Mono', monospace",
};

export function SubmissionPricingSummary({
    pricingSummary,
    variableSymbol,
    totalPrice,
    priceDiff,
}: SubmissionPricingSummaryProps) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {variableSymbol && (
                <Box>
                    <Typography variant="body2" sx={{ mb: 0.5, color: p.ink2 }}>
                        Variabilní symbol
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{ ...monoSx, letterSpacing: 1, color: p.ink }}
                    >
                        {variableSymbol}
                    </Typography>
                </Box>
            )}

            {totalPrice != null && (
                <Box>
                    <Typography variant="body2" sx={{ mb: 0.5, color: p.ink2 }}>
                        Celková cena
                    </Typography>
                    <Typography
                        variant="h6"
                        fontWeight={600}
                        sx={{ ...monoSx, color: p.ink }}
                    >
                        {formatPrice(totalPrice)}
                    </Typography>
                    {priceDiff != null && priceDiff !== 0 && (
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                                ...monoSx,
                                color: priceDiff > 0 ? p.warnInk : p.valueInk,
                            }}
                        >
                            {priceDiff > 0 ? "+" : ""}
                            {priceDiff.toLocaleString("cs-CZ")} Kč
                        </Typography>
                    )}
                </Box>
            )}

            {pricingSummary && pricingSummary.tiers.length > 0 && (
                <Box>
                    <Typography variant="body2" sx={{ mb: 1, color: p.ink2 }}>
                        Cenové hladiny
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                        }}
                    >
                        {pricingSummary.tiers.map((tier, idx) => {
                            const isApplicable =
                                idx === pricingSummary.applicableTierIndex;
                            const label = tier.tierDate
                                ? `Do ${formatDate(tier.tierDate)}`
                                : "Na místě";

                            return (
                                <Box
                                    key={idx}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontWeight={isApplicable ? 700 : 400}
                                        sx={{
                                            color: isApplicable
                                                ? p.ink
                                                : p.ink2,
                                        }}
                                    >
                                        {label}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={
                                                isApplicable ? 700 : 400
                                            }
                                            sx={{
                                                ...monoSx,
                                                color: isApplicable
                                                    ? p.ink
                                                    : p.ink2,
                                            }}
                                        >
                                            {formatPrice(tier.totalPrice)}
                                        </Typography>
                                        {isApplicable && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    px: "9px",
                                                    py: "3px",
                                                    borderRadius: "20px",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    backgroundColor:
                                                        p.indigoSoft,
                                                    color: p.indigoInk,
                                                }}
                                            >
                                                Aktuální
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {!variableSymbol && totalPrice == null && !pricingSummary && (
                <Typography variant="body2" sx={{ color: p.ink3 }}>
                    Žádné cenové údaje
                </Typography>
            )}
        </Box>
    );
}
