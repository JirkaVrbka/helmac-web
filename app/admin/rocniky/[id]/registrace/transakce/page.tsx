import { Container } from "@mui/material";
import { notFound } from "next/navigation";
import { BankTransactionMatchStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { BankTransactionsTable } from "@/components/admin/bank-transactions-table";
import { getUnpaidOrdersForYear } from "@/lib/services/v2";

interface TransakcePageProps {
    params: Promise<{ id: string }>;
}

async function getYearBasic(yearId: string) {
    return db.year.findUnique({
        where: { id: yearId },
        select: { id: true, year: true },
    });
}

async function getAllTransactions(yearId: string) {
    return db.bankTransaction.findMany({
        where: {
            OR: [
                { yearId },
                {
                    yearId: null,
                    matchStatus: {
                        in: [
                            BankTransactionMatchStatus.UNKNOWN_VS,
                            BankTransactionMatchStatus.NO_VARIABLE_SYMBOL,
                        ],
                    },
                },
            ],
        },
        orderBy: { date: "desc" },
        select: {
            id: true,
            date: true,
            amount: true,
            currency: true,
            variableSymbol: true,
            counterpartAccount: true,
            counterpartName: true,
            userMessage: true,
            matchStatus: true,
            orderId: true,
            submissionId: true,
            order: {
                select: { legacySubmissionId: true },
            },
        },
    });
}

export default async function TransakcePage({ params }: TransakcePageProps) {
    await requireAdmin();
    const { id } = await params;
    const [year, transactions, unpaidOrders] = await Promise.all([
        getYearBasic(id),
        getAllTransactions(id),
        getUnpaidOrdersForYear(id),
    ]);

    if (!year) {
        notFound();
    }

    const transactionsForClient = transactions.map((tx) => ({
        id: tx.id,
        date: tx.date.toISOString(),
        amount: tx.amount,
        currency: tx.currency,
        variableSymbol: tx.variableSymbol,
        counterpartAccount: tx.counterpartAccount,
        counterpartName: tx.counterpartName,
        userMessage: tx.userMessage,
        matchStatus: tx.matchStatus,
        orderId: tx.orderId,
        submissionId: tx.submissionId,
        legacySubmissionId: tx.order?.legacySubmissionId ?? null,
    }));

    return (
        <Container maxWidth="lg">
            <PageHeader
                breadcrumbs={[
                    { label: "Ročníky", href: "/admin/rocniky" },
                    {
                        label: `${year.year}`,
                        href: `/admin/rocniky/${year.id}`,
                    },
                    {
                        label: "Registrace",
                        href: `/admin/rocniky/${year.id}/registrace`,
                    },
                    { label: "Transakce" },
                ]}
                title="Bankovní transakce"
            />

            <BankTransactionsTable
                transactions={transactionsForClient}
                yearId={year.id}
                unpaidOrders={unpaidOrders}
                showFilter
            />
        </Container>
    );
}
