"use client";

import {
    Box,
    ButtonBase,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import type {
    ConditionRule,
    FormCondition,
    FormElement,
    FormField,
    InputField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { isInputField } from "@/lib/types/registration-form";
import { RuleRow } from "@/components/admin/form-builder/condition-editor";
import { builderPalette as p } from "./palette";

// Segmented AND/OR control — the rule-builder accent (mirrors condition-editor).
const andOrGroupSx = {
    backgroundColor: p.surface2,
    border: `1px solid ${p.line}`,
    borderRadius: "10px",
    p: "3px",
    gap: "2px",
    "& .MuiToggleButton-root": {
        border: 0,
        borderRadius: "7px !important",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        height: 22,
        px: 1,
        py: 0,
        lineHeight: 1,
        color: p.ink2,
        transition: "all 120ms ease",
        "&:hover": { backgroundColor: "transparent", color: p.indigo },
    },
};
const andToggleSx = {
    "&.Mui-selected": {
        backgroundColor: p.indigo,
        color: "white",
        "&:hover": { backgroundColor: "#4338ca", color: "white" },
    },
};
const orToggleSx = {
    "&.Mui-selected": {
        backgroundColor: p.or,
        color: "white",
        "&:hover": { backgroundColor: p.or, color: "white" },
    },
};

interface SingleConditionEditorProps {
    condition: FormCondition;
    allFields: FormField[];
    elements?: FormElement[];
    pricingDefinitions?: PricingDefinition[];
    onChange: (next: FormCondition) => void;
}

export function SingleConditionEditor({
    condition,
    allFields,
    pricingDefinitions,
    onChange,
}: SingleConditionEditorProps) {
    const inputFields = allFields.filter((f): f is InputField =>
        isInputField(f)
    );

    const updateRule = (index: number, updates: Partial<ConditionRule>) => {
        const newRules = [...condition.rules];
        newRules[index] = { ...newRules[index], ...updates };
        onChange({ ...condition, rules: newRules });
    };

    const updateConnector = (index: number, connector: "AND" | "OR") => {
        updateRule(index, { connector });
    };

    const deleteRule = (index: number) => {
        onChange({
            ...condition,
            rules: condition.rules.filter((_, i) => i !== index),
        });
    };

    const addRule = () => {
        const isFirst = condition.rules.length === 0;
        onChange({
            ...condition,
            rules: [
                ...condition.rules,
                {
                    type: "field_value",
                    fieldId: "",
                    operator: "equals",
                    value: "",
                    ...(isFirst ? {} : { connector: "AND" as const }),
                },
            ],
        });
    };

    return (
        <Box>
            <Typography
                sx={{
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: p.ink3,
                    mb: 1,
                }}
            >
                Podmínka
            </Typography>

            {condition.rules.length === 0 && (
                <Typography variant="body2" sx={{ color: p.ink2, mb: 1.5 }}>
                    Přidejte alespoň jedno pravidlo. Sekce bude odeslána pouze
                    pokud podmínka platí.
                </Typography>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {condition.rules.map((rule, ruleIdx) => (
                    <Box key={ruleIdx}>
                        {ruleIdx > 0 && (
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    my: 0.5,
                                }}
                            >
                                <ToggleButtonGroup
                                    value={rule.connector ?? "AND"}
                                    exclusive
                                    size="small"
                                    onChange={(_, val) => {
                                        if (val === "AND" || val === "OR") {
                                            updateConnector(ruleIdx, val);
                                        }
                                    }}
                                    sx={andOrGroupSx}
                                >
                                    <ToggleButton value="AND" sx={andToggleSx}>
                                        AND
                                    </ToggleButton>
                                    <ToggleButton value="OR" sx={orToggleSx}>
                                        OR
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        )}
                        <RuleRow
                            rule={rule}
                            inputFields={inputFields}
                            allFields={allFields}
                            pricingDefinitions={pricingDefinitions}
                            onUpdate={(updates) => updateRule(ruleIdx, updates)}
                            onDelete={() => deleteRule(ruleIdx)}
                            canDelete
                            compact
                        />
                    </Box>
                ))}
            </Box>

            <Box sx={{ mt: 1 }}>
                <ButtonBase
                    onClick={addRule}
                    sx={{
                        py: "7px",
                        px: "12px",
                        backgroundColor: p.surface,
                        border: `1px dashed ${p.line}`,
                        borderRadius: "10px",
                        color: p.indigo,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 140ms ease",
                        "&:hover": {
                            borderColor: p.indigo,
                            backgroundColor: p.indigoSoft,
                        },
                    }}
                >
                    <Add sx={{ fontSize: 16 }} />
                    Přidat pravidlo
                </ButtonBase>
            </Box>
        </Box>
    );
}
