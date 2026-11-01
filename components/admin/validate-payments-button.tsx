"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Tooltip } from "@mui/material";
import { Sync } from "@mui/icons-material";
import { triggerGlobalManualSync } from "@/lib/actions/bank-account";
import { useToast } from "@/lib/hooks/use-toast";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

function formatNewPaymentsMessage(count: number): string {
    if (count === 0) {
        return "Žádné nové platby nebyly nalezeny";
    }
    if (count === 1) {
        return "Byla zaregistrována 1 nová platba";
    }
    if (count >= 2 && count <= 4) {
        return `Byly zaregistrovány ${count} nové platby`;
    }
    return `Bylo zaregistrováno ${count} nových plateb`;
}

export function ValidatePaymentsButton() {
    const router = useRouter();
    const toast = useToast();
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await triggerGlobalManualSync();

            if ("error" in result && result.error) {
                toast.warning(result.error);
                return;
            }

            if ("result" in result && result.result) {
                const newPayments =
                    result.result.matched + result.result.overpayment;
                toast.info(formatNewPaymentsMessage(newPayments));
                router.refresh();
            }
        });
    };

    return (
        <Tooltip title="Načte bankovní transakce z Fio API a zkontroluje, zda byly od poslední synchronizace zaplaceny nějaké nové přihlášky.">
            <span>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Sync />}
                    onClick={handleClick}
                    disabled={isPending}
                    sx={{
                        borderRadius: "10px",
                        color: p.ink2,
                        borderColor: p.line,
                        "&:hover": {
                            borderColor: p.indigo,
                            backgroundColor: p.indigoSoft,
                            color: p.indigo,
                        },
                    }}
                >
                    Validuj platby
                </Button>
            </span>
        </Tooltip>
    );
}
