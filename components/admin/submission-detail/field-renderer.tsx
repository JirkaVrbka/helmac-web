import {
    Box,
    TextField,
    FormControlLabel,
    Checkbox,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Radio,
    Typography,
} from "@mui/material";
import type { V2PricingDef } from "@/lib/services/v2";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";
import type { FieldMeta } from "./types";

export interface FieldRendererProps {
    field: FieldMeta;
    value: string;
    quantities?: Record<string, number>;
    multiSelected?: string[];
    pricingDef?: V2PricingDef;
    onChange: (value: string) => void;
    onQuantityChange?: (optionId: string, qty: number) => void;
    onMultiSelectChange?: (selected: string[]) => void;
    disabled: boolean;
}

// Builder-palette label above an option group (admin design system).
const groupLabelSx = {
    fontSize: 12,
    fontWeight: 600,
    color: p.ink2,
    mb: 1,
};

// Selectable option tile — indigo accent when active (admin design system).
function optionBoxSx(active: boolean, disabled: boolean) {
    return {
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.5,
        border: `1px solid ${active ? p.indigo : p.line}`,
        borderRadius: "10px",
        backgroundColor: active ? p.indigoSoft : p.surface,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 140ms ease",
        "&:hover": disabled
            ? {}
            : {
                  borderColor: active ? p.indigo : p.ink3,
              },
    } as const;
}

export function FieldRenderer({
    field,
    value,
    quantities,
    multiSelected,
    pricingDef,
    onChange,
    onQuantityChange,
    onMultiSelectChange,
    disabled,
}: FieldRendererProps) {
    const label = field.isActive ? (
        field.label
    ) : (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
            }}
        >
            {field.label}
            <Box
                component="span"
                sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: p.ink2,
                    backgroundColor: p.surface3,
                    px: "7px",
                    py: "2px",
                    borderRadius: "6px",
                }}
            >
                Zrušené pole
            </Box>
        </Box>
    );

    switch (field.type) {
        case "checkbox":
            return (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={value === "true"}
                            onChange={(e) => onChange(String(e.target.checked))}
                            disabled={disabled}
                            sx={{
                                "&.Mui-checked": {
                                    color: p.indigo,
                                },
                            }}
                        />
                    }
                    label={label}
                />
            );

        case "select":
            return (
                <FormControl fullWidth size="small" sx={builderFieldSx}>
                    <InputLabel>{label}</InputLabel>
                    <Select
                        value={value}
                        onChange={(e) => onChange(e.target.value as string)}
                        label={field.label}
                        disabled={disabled}
                    >
                        {field.options.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );

        case "radio":
        case "pricing_select": {
            const options =
                field.type === "pricing_select"
                    ? (pricingDef?.options ?? []).map((o) => ({
                          id: o.id,
                          label: o.name,
                      }))
                    : field.options.map((o) => ({
                          id: o,
                          label: o,
                      }));
            const cols = Math.min(options.length, 3);
            return (
                <Box>
                    <Typography variant="body2" sx={groupLabelSx}>
                        {label}
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: `repeat(${cols}, 1fr)`,
                            },
                            gap: 1,
                        }}
                    >
                        {options.map((opt) => {
                            const isSelected = value === opt.id;
                            return (
                                <Box
                                    key={opt.id}
                                    onClick={() =>
                                        !disabled && onChange(opt.id)
                                    }
                                    sx={optionBoxSx(isSelected, disabled)}
                                >
                                    <Radio
                                        size="small"
                                        checked={isSelected}
                                        disabled={disabled}
                                        sx={{
                                            p: 0,
                                            "&.Mui-checked": {
                                                color: p.indigo,
                                            },
                                        }}
                                        tabIndex={-1}
                                    />
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: p.ink,
                                        }}
                                        fontWeight={isSelected ? 600 : 400}
                                    >
                                        {opt.label}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }

        case "pricing_quantity": {
            const options = pricingDef?.options ?? [];
            const cols = Math.min(options.length, 3);
            return (
                <Box>
                    <Typography variant="body2" sx={groupLabelSx}>
                        {label}
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: `repeat(${cols}, 1fr)`,
                            },
                            gap: 1,
                        }}
                    >
                        {options.map((opt) => {
                            const qty = quantities?.[opt.id] ?? 0;
                            const active = qty > 0;
                            return (
                                <Box
                                    key={opt.id}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 1.5,
                                        px: 2,
                                        py: 1,
                                        border: `1px solid ${active ? p.indigo : p.line}`,
                                        borderRadius: "10px",
                                        backgroundColor: active
                                            ? p.indigoSoft
                                            : p.surface,
                                        opacity: disabled ? 0.6 : 1,
                                    }}
                                >
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: p.ink,
                                        }}
                                        fontWeight={active ? 600 : 400}
                                    >
                                        {opt.name}
                                    </Typography>
                                    <TextField
                                        type="number"
                                        value={String(qty)}
                                        onChange={(e) => {
                                            const n = Math.max(
                                                0,
                                                Math.floor(
                                                    Number(e.target.value) || 0
                                                )
                                            );
                                            onQuantityChange?.(opt.id, n);
                                        }}
                                        size="small"
                                        inputProps={{
                                            min: 0,
                                            step: 1,
                                        }}
                                        disabled={disabled}
                                        sx={{
                                            width: 80,
                                            ...builderFieldSx,
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }

        case "pricing_multi_select": {
            const msOptions = pricingDef?.options ?? [];
            const cols = Math.min(msOptions.length, 3);
            return (
                <Box>
                    <Typography variant="body2" sx={groupLabelSx}>
                        {label}
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: `repeat(${cols}, 1fr)`,
                            },
                            gap: 1,
                        }}
                    >
                        {msOptions.map((opt) => {
                            const isSelected =
                                multiSelected?.includes(opt.id) ?? false;
                            return (
                                <Box
                                    key={opt.id}
                                    onClick={() => {
                                        if (disabled) return;
                                        const next = isSelected
                                            ? (multiSelected ?? []).filter(
                                                  (s) => s !== opt.id
                                              )
                                            : [
                                                  ...(multiSelected ?? []),
                                                  opt.id,
                                              ];
                                        onMultiSelectChange?.(next);
                                    }}
                                    sx={optionBoxSx(isSelected, disabled)}
                                >
                                    <Checkbox
                                        size="small"
                                        checked={isSelected}
                                        disabled={disabled}
                                        sx={{
                                            p: 0,
                                            "&.Mui-checked": {
                                                color: p.indigo,
                                            },
                                        }}
                                        tabIndex={-1}
                                    />
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: p.ink,
                                        }}
                                        fontWeight={isSelected ? 600 : 400}
                                    >
                                        {opt.name}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }

        case "textarea":
            return (
                <TextField
                    label={label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                    disabled={disabled}
                    sx={builderFieldSx}
                />
            );

        default:
            return (
                <TextField
                    label={label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    type={
                        field.type === "email"
                            ? "email"
                            : field.type === "number"
                              ? "number"
                              : field.type === "date" ||
                                  field.type === "birth_date"
                                ? "date"
                                : "text"
                    }
                    fullWidth
                    size="small"
                    InputLabelProps={
                        field.type === "date" || field.type === "birth_date"
                            ? { shrink: true }
                            : undefined
                    }
                    disabled={disabled}
                    sx={builderFieldSx}
                />
            );
    }
}
