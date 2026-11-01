"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { createConditionalEmail } from "@/lib/actions/conditional-emails";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

type ConditionOperator =
    | "equals"
    | "is_set"
    | "is_not_set"
    | "quantity_gt_zero"
    | "quantity_any_gt_zero";

interface FieldOption {
    id: string;
    name: string;
    label: string;
    type: string;
    options: string[];
}

interface CreateConditionalEmailDialogProps {
    yearId: string;
    availableFields: FieldOption[];
}

export function CreateConditionalEmailDialog({
    yearId,
    availableFields,
}: CreateConditionalEmailDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [selectedFieldId, setSelectedFieldId] = useState("");
    const [operator, setOperator] = useState<ConditionOperator>("equals");
    const [selectedValue, setSelectedValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const selectedField = availableFields.find((f) => f.id === selectedFieldId);
    const isQuantityField = selectedField?.type === "pricing_quantity";
    const valueRequired =
        operator === "equals" || operator === "quantity_gt_zero";

    const handleOpen = () => {
        setOpen(true);
        setName("");
        setSelectedFieldId("");
        setOperator("equals");
        setSelectedValue("");
        setError(null);
    };

    const handleClose = () => {
        if (!isPending) {
            setOpen(false);
        }
    };

    const handleSubmit = () => {
        if (
            !name.trim() ||
            !selectedFieldId ||
            (valueRequired && !selectedValue)
        ) {
            setError("Vyplňte všechna pole");
            return;
        }

        const field = availableFields.find((f) => f.id === selectedFieldId);
        if (!field) return;

        setError(null);
        startTransition(async () => {
            const result = await createConditionalEmail(yearId, {
                name: name.trim(),
                conditionFieldId: selectedFieldId,
                conditionFieldName: field.name,
                conditionOperator: operator,
                conditionValue: valueRequired ? selectedValue : undefined,
            });

            if (result && "error" in result && result.error) {
                setError(
                    typeof result.error === "string"
                        ? result.error
                        : "Nepodařilo se vytvořit email"
                );
                return;
            }

            if (result && "id" in result && result.id) {
                setOpen(false);
                router.push(
                    `/admin/rocniky/${yearId}/emaily/podmineny/${result.id}`
                );
                router.refresh();
            }
        });
    };

    const isSubmitDisabled =
        isPending ||
        !name.trim() ||
        !selectedFieldId ||
        (valueRequired && !selectedValue);

    return (
        <>
            <Button
                startIcon={<Add />}
                onClick={handleOpen}
                sx={{
                    mt: 3,
                    backgroundColor: p.surface,
                    border: `1px dashed ${p.line}`,
                    borderRadius: "10px",
                    color: p.indigo,
                    textTransform: "none",
                    fontWeight: 600,
                    px: "14px",
                    py: "8px",
                    "&:hover": {
                        borderColor: p.indigo,
                        backgroundColor: p.indigoSoft,
                    },
                }}
            >
                Vytvořit podmíněný email
            </Button>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Nový podmíněný email
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            mt: 1,
                        }}
                    >
                        <TextField
                            label="Název emailu"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            placeholder="např. Email pro vegetariány"
                            disabled={isPending}
                            sx={builderFieldSx}
                        />

                        <FormControl
                            fullWidth
                            disabled={isPending}
                            sx={builderFieldSx}
                        >
                            <InputLabel>Pole podmínky</InputLabel>
                            <Select
                                value={selectedFieldId}
                                onChange={(e) => {
                                    const newFieldId = e.target.value;
                                    setSelectedFieldId(newFieldId);
                                    setSelectedValue("");
                                    const newField = availableFields.find(
                                        (f) => f.id === newFieldId
                                    );
                                    if (newField?.type === "pricing_quantity") {
                                        setOperator("quantity_gt_zero");
                                    } else if (
                                        operator === "quantity_gt_zero"
                                    ) {
                                        setOperator("equals");
                                    }
                                }}
                                label="Pole podmínky"
                            >
                                {availableFields.map((field) => (
                                    <MenuItem key={field.id} value={field.id}>
                                        {field.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {selectedField && (
                            <FormControl
                                fullWidth
                                disabled={isPending}
                                sx={builderFieldSx}
                            >
                                <InputLabel>Operátor</InputLabel>
                                <Select
                                    value={operator}
                                    onChange={(e) => {
                                        setOperator(
                                            e.target.value as ConditionOperator
                                        );
                                        setSelectedValue("");
                                    }}
                                    label="Operátor"
                                >
                                    {isQuantityField
                                        ? [
                                              <MenuItem
                                                  key="quantity_gt_zero"
                                                  value="quantity_gt_zero"
                                              >
                                                  Konkrétní volba: počet &gt; 0
                                              </MenuItem>,
                                              <MenuItem
                                                  key="quantity_any_gt_zero"
                                                  value="quantity_any_gt_zero"
                                              >
                                                  Jakákoli volba: počet &gt; 0
                                              </MenuItem>,
                                          ]
                                        : [
                                              <MenuItem
                                                  key="equals"
                                                  value="equals"
                                              >
                                                  Konkrétní hodnota
                                              </MenuItem>,
                                              <MenuItem
                                                  key="is_set"
                                                  value="is_set"
                                              >
                                                  Cokoli vybráno
                                              </MenuItem>,
                                              <MenuItem
                                                  key="is_not_set"
                                                  value="is_not_set"
                                              >
                                                  Nic nevybráno
                                              </MenuItem>,
                                          ]}
                                </Select>
                            </FormControl>
                        )}

                        {selectedField && valueRequired && (
                            <FormControl
                                fullWidth
                                disabled={isPending}
                                sx={builderFieldSx}
                            >
                                <InputLabel>
                                    {isQuantityField ? "Volba" : "Hodnota"}
                                </InputLabel>
                                <Select
                                    value={selectedValue}
                                    onChange={(e) =>
                                        setSelectedValue(e.target.value)
                                    }
                                    label={
                                        isQuantityField ? "Volba" : "Hodnota"
                                    }
                                >
                                    {selectedField.type === "checkbox"
                                        ? [
                                              <MenuItem key="true" value="true">
                                                  Zaškrtnuto
                                              </MenuItem>,
                                              <MenuItem
                                                  key="false"
                                                  value="false"
                                              >
                                                  Nezaškrtnuto
                                              </MenuItem>,
                                          ]
                                        : selectedField.options.map((opt) => (
                                              <MenuItem key={opt} value={opt}>
                                                  {opt}
                                              </MenuItem>
                                          ))}
                                </Select>
                            </FormControl>
                        )}

                        {error && <Alert severity="error">{error}</Alert>}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        sx={{
                            color: p.ink2,
                            borderRadius: "10px",
                            border: `1px solid ${p.line}`,
                            "&:hover": {
                                borderColor: p.ink3,
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={isSubmitDisabled}
                        disableElevation
                        sx={{
                            borderRadius: "10px",
                            backgroundColor: p.indigo,
                            "&:hover": { backgroundColor: "#4338ca" },
                        }}
                    >
                        Vytvořit
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
