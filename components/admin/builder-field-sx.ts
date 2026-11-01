import type { SxProps, Theme } from "@mui/material";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

/**
 * Builder-palette styling for MUI outlined inputs (admin design system).
 *
 * Spread onto a `TextField`, `Select`, `Autocomplete`, or the wrapping
 * `FormControl` to give it the builder look: white surface, {@link builderPalette.line}
 * border, 10px radius, and an indigo focus ring. Keeps components opting in
 * per-page instead of a global theme override.
 *
 * ```tsx
 * <TextField size="small" sx={builderFieldSx} />
 * <FormControl size="small" sx={builderFieldSx}>…</FormControl>
 * ```
 */
export const builderFieldSx: SxProps<Theme> = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "10px",
        backgroundColor: p.surface,
        transition: "box-shadow 120ms ease",
        "& fieldset": {
            borderColor: p.line,
            transition: "border-color 120ms ease",
        },
        "&:hover fieldset": {
            borderColor: p.ink3,
        },
        "&.Mui-focused fieldset": {
            borderColor: p.indigo,
            borderWidth: "1px",
        },
        "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${p.indigoSoft}`,
        },
        "&.Mui-error fieldset": {
            borderColor: p.negInk,
        },
        "&.Mui-error.Mui-focused": {
            boxShadow: `0 0 0 3px ${p.neg}`,
        },
    },
    "& .MuiInputLabel-root.Mui-focused": {
        color: p.indigo,
    },
    "& .MuiInputLabel-root.Mui-error": {
        color: p.negInk,
    },
    "& .MuiFormHelperText-root": {
        color: p.ink3,
    },
    "& .MuiFormHelperText-root.Mui-error": {
        color: p.negInk,
    },
};
