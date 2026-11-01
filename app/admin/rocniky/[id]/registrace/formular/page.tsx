import { Container, Alert } from "@mui/material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { FormBuilder } from "@/components/admin/form-builder";
import { migrateFormData } from "@/lib/utils/form-migration";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface FormularPageProps {
    params: Promise<{ id: string }>;
}

async function getYearWithForm(yearId: string) {
    return db.year.findUnique({
        where: { id: yearId },
        select: {
            id: true,
            year: true,
            title: true,
            confirmationEmailSubject: true,
            confirmationEmailBody: true,
            registrationForm: { select: { id: true, fields: true } },
            conditionalEmails: {
                select: {
                    id: true,
                    name: true,
                    conditionFieldId: true,
                    conditionValue: true,
                    subject: true,
                    body: true,
                },
            },
        },
    });
}

function extractEmailFieldNames(
    subject: string | null,
    body: string | null
): string[] {
    const names = new Set<string>();
    const regex = /\{(\w+)\}/g;
    for (const text of [subject, body]) {
        if (!text) continue;
        let match;
        while ((match = regex.exec(text)) !== null) {
            names.add(match[1]);
        }
    }
    return Array.from(names);
}

export default async function FormularPage({ params }: FormularPageProps) {
    const session = await requireEditor();
    const isEditor = session.user?.role === "EDITOR";
    const { id } = await params;
    const year = await getYearWithForm(id);

    if (!year) {
        notFound();
    }

    const formData = migrateFormData(year.registrationForm?.fields);

    // Extract field names used in confirmation email placeholders
    const emailFieldNames = extractEmailFieldNames(
        year.confirmationEmailSubject,
        year.confirmationEmailBody
    );

    // Also extract field names used in conditional email placeholders
    for (const ce of year.conditionalEmails) {
        const ceFieldNames = extractEmailFieldNames(ce.subject, ce.body);
        for (const name of ceFieldNames) {
            emailFieldNames.push(name);
        }
    }

    // Deduplicate
    const uniqueEmailFieldNames = [...new Set(emailFieldNames)];

    // Pass conditional email condition info for field/option deletion guards
    const conditionalEmails = year.conditionalEmails.map((ce) => ({
        id: ce.id,
        name: ce.name,
        conditionFieldId: ce.conditionFieldId,
        conditionValue: ce.conditionValue,
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
                    { label: "Formulář" },
                ]}
                title="Registrační formulář"
            />
            {isEditor && (
                <Alert
                    icon={false}
                    sx={{
                        mb: 2,
                        borderRadius: "12px",
                        backgroundColor: p.field,
                        color: p.fieldInk,
                        "& .MuiAlert-message": { color: p.fieldInk },
                    }}
                >
                    Formulář je zobrazen pouze pro čtení.
                </Alert>
            )}
            <FormBuilder
                yearId={year.id}
                initialFormData={formData}
                emailFieldNames={uniqueEmailFieldNames}
                conditionalEmails={conditionalEmails}
                readOnly={isEditor}
            />
        </Container>
    );
}
