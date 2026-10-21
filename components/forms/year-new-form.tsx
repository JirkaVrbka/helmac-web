"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    CardActions,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    FormControlLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Save, ExpandMore } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import { LinkButton } from "@/components/ui/link-button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createYear, loadYearCopyInventory } from "@/lib/actions/years";
import type { YearActionState } from "@/lib/actions/years";
import type { YearCopyInventory } from "@/lib/services/year-copy-inventory";
import type { YearCopySelection } from "@/lib/utils/year-copy";

interface YearNewFormProps {
    years: { id: string; year: number; title: string }[];
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={
                pending ? (
                    <CircularProgress size={20} color="inherit" />
                ) : (
                    <Save />
                )
            }
        >
            {pending ? "Ukládám..." : "Vytvořit ročník"}
        </Button>
    );
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) {
        next.delete(id);
    } else {
        next.add(id);
    }
    return next;
}

interface PickerItem {
    id: string;
    primary: string;
    secondary?: string;
}

interface CategoryPickerProps {
    title: string;
    items: PickerItem[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
}

function CategoryPicker({
    title,
    items,
    selected,
    onChange,
}: CategoryPickerProps) {
    if (items.length === 0) return null;

    const allSelected = items.every((item) => selected.has(item.id));
    const someSelected = items.some((item) => selected.has(item.id));

    return (
        <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>
                    {title} ({selected.size}/{items.length})
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            onChange={(e) => {
                                onChange(
                                    e.target.checked
                                        ? new Set(items.map((i) => i.id))
                                        : new Set()
                                );
                            }}
                        />
                    }
                    label="Vybrat vše"
                />
                <Divider sx={{ my: 1 }} />
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {items.map((item) => (
                        <FormControlLabel
                            key={item.id}
                            control={
                                <Checkbox
                                    checked={selected.has(item.id)}
                                    onChange={() =>
                                        onChange(toggleInSet(selected, item.id))
                                    }
                                />
                            }
                            label={
                                item.secondary
                                    ? `${item.primary} ${item.secondary}`
                                    : item.primary
                            }
                        />
                    ))}
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}

interface SectionBlocksPickerProps {
    sectionTypes: YearCopyInventory["sectionTypes"];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
}

/**
 * Nested section-block picker: one Accordion per SectionType (a page), each
 * listing its section blocks as checkboxes. All operations MERGE into the
 * single shared `selected` Set — unlike the generic CategoryPicker which
 * replaces the whole set — so toggling one type never discards another type's
 * selected ids.
 */
function SectionBlocksPicker({
    sectionTypes,
    selected,
    onChange,
}: SectionBlocksPickerProps) {
    if (sectionTypes.length === 0) return null;

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Sekce
            </Typography>
            {sectionTypes.map((st) => {
                const ids = st.sections.map((s) => s.id);
                const selectedCount = ids.filter((id) =>
                    selected.has(id)
                ).length;
                const allSelected =
                    ids.length > 0 && selectedCount === ids.length;
                const someSelected = selectedCount > 0 && !allSelected;

                return (
                    <Accordion key={st.id} disableGutters>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography>
                                {st.label} ({selectedCount}/{st.sections.length}
                                )
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {st.sections.length === 0 ? (
                                // Empty section type: no blocks to select, so
                                // it simply can't be block-selected (acceptable).
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Žádné sekce
                                </Typography>
                            ) : (
                                <>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={someSelected}
                                                onChange={(e) => {
                                                    const next = new Set(
                                                        selected
                                                    );
                                                    if (e.target.checked) {
                                                        ids.forEach((id) =>
                                                            next.add(id)
                                                        );
                                                    } else {
                                                        ids.forEach((id) =>
                                                            next.delete(id)
                                                        );
                                                    }
                                                    onChange(next);
                                                }}
                                            />
                                        }
                                        label="Vybrat vše"
                                    />
                                    <Divider sx={{ my: 1 }} />
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                        }}
                                    >
                                        {st.sections.map((section) => (
                                            <FormControlLabel
                                                key={section.id}
                                                control={
                                                    <Checkbox
                                                        checked={selected.has(
                                                            section.id
                                                        )}
                                                        onChange={() =>
                                                            onChange(
                                                                toggleInSet(
                                                                    selected,
                                                                    section.id
                                                                )
                                                            )
                                                        }
                                                    />
                                                }
                                                label={section.title}
                                            />
                                        ))}
                                    </Box>
                                </>
                            )}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Box>
    );
}

interface ReuseSectionProps {
    inventory: YearCopyInventory;
    anchorStartDateError?: string;
}

/**
 * Holds all content-selection state that depends on the chosen source year.
 * Mounted with `key={sourceYearId}` by the parent so a source change remounts
 * it with fresh state instead of needing a reset effect. Owns only content
 * selection + anchorStartDate — never photos, dates or identity.
 */
function ReuseSection({ inventory, anchorStartDateError }: ReuseSectionProps) {
    const [anchorStartDate, setAnchorStartDate] = useState<Dayjs | null>(null);

    const [sectionIds, setSectionIds] = useState<Set<string>>(new Set());
    const [homepageStepIds, setHomepageStepIds] = useState<Set<string>>(
        new Set()
    );
    const [newsIds, setNewsIds] = useState<Set<string>>(new Set());
    const [programDayIds, setProgramDayIds] = useState<Set<string>>(new Set());
    const [v2EmailTemplateIds, setV2EmailTemplateIds] = useState<Set<string>>(
        new Set()
    );
    const [copyRegistrationForm, setCopyRegistrationForm] = useState(false);
    const [copyLimits, setCopyLimits] = useState(false);
    const [copySuccessContent, setCopySuccessContent] = useState(false);

    const needsAnchorDate =
        inventory.sourceYear.startDate === null &&
        (programDayIds.size > 0 || copyRegistrationForm);

    // Conditional email templates require the registration form (its
    // V2FormCondition rows) to be copied along with them.
    const selectableTemplateIds = new Set(
        inventory.v2EmailTemplates
            .filter((t) => !t.isConditional || copyRegistrationForm)
            .map((t) => t.id)
    );
    const effectiveV2EmailTemplateIds = new Set(
        [...v2EmailTemplateIds].filter((id) => selectableTemplateIds.has(id))
    );

    const selection: YearCopySelection = {
        sectionIds: [...sectionIds],
        homepageStepIds: [...homepageStepIds],
        newsIds: [...newsIds],
        programDayIds: [...programDayIds],
        v2EmailTemplateIds: [...effectiveV2EmailTemplateIds],
        copyRegistrationForm,
        copyLimits: copyRegistrationForm ? copyLimits : false,
        copySuccessContent,
    };

    return (
        <>
            {needsAnchorDate && (
                <Box>
                    <DatePicker
                        label="Začátek zdrojového ročníku"
                        value={anchorStartDate}
                        onChange={(v) => setAnchorStartDate(v)}
                        format="DD.MM.YYYY"
                        slotProps={{
                            textField: {
                                required: true,
                                fullWidth: true,
                                error: !!anchorStartDateError,
                                helperText:
                                    anchorStartDateError ??
                                    "Zdrojový ročník nemá uložené datum začátku — zadejte ho, aby šlo správně posunout zkopírovaná data (program, termíny registrace).",
                            },
                        }}
                    />
                    <input
                        type="hidden"
                        name="anchorStartDate"
                        value={anchorStartDate?.format("YYYY-MM-DD") ?? ""}
                    />
                </Box>
            )}

            <Typography variant="subtitle2">Obsah k zkopírování</Typography>

            <SectionBlocksPicker
                sectionTypes={inventory.sectionTypes}
                selected={sectionIds}
                onChange={setSectionIds}
            />

            <CategoryPicker
                title="Kroky na úvodu"
                items={inventory.homepageSteps.map((s) => ({
                    id: s.id,
                    primary: s.title,
                }))}
                selected={homepageStepIds}
                onChange={setHomepageStepIds}
            />

            <CategoryPicker
                title="Novinky"
                items={inventory.news.map((n) => ({
                    id: n.id,
                    primary: n.title,
                    secondary: n.isPublished ? undefined : "(koncept)",
                }))}
                selected={newsIds}
                onChange={setNewsIds}
            />

            <CategoryPicker
                title="Program"
                items={inventory.programDays.map((d) => ({
                    id: d.id,
                    primary: d.label,
                    secondary: `${dayjs(d.date).format("DD.MM.YYYY")} (${d.eventCount} událostí)`,
                }))}
                selected={programDayIds}
                onChange={setProgramDayIds}
            />

            {inventory.v2EmailTemplates.length > 0 && (
                <Accordion disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>
                            E-mailové šablony (
                            {effectiveV2EmailTemplateIds.size}/
                            {inventory.v2EmailTemplates.length})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                            {inventory.v2EmailTemplates.map((t) => {
                                const disabled =
                                    t.isConditional && !copyRegistrationForm;
                                const checkbox = (
                                    <Checkbox
                                        checked={
                                            !disabled &&
                                            v2EmailTemplateIds.has(t.id)
                                        }
                                        disabled={disabled}
                                        onChange={() =>
                                            setV2EmailTemplateIds(
                                                toggleInSet(
                                                    v2EmailTemplateIds,
                                                    t.id
                                                )
                                            )
                                        }
                                    />
                                );
                                const label = `${t.name || t.type}${
                                    t.enabled ? "" : " (vypnuto)"
                                }`;

                                return disabled ? (
                                    <Tooltip
                                        key={t.id}
                                        title="Vyžaduje zkopírování registračního formuláře"
                                    >
                                        <FormControlLabel
                                            control={checkbox}
                                            label={label}
                                        />
                                    </Tooltip>
                                ) : (
                                    <FormControlLabel
                                        key={t.id}
                                        control={checkbox}
                                        label={label}
                                    />
                                );
                            })}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            )}

            {inventory.registrationForm && (
                <Accordion disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Registrační formulář</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={copyRegistrationForm}
                                    onChange={(e) => {
                                        setCopyRegistrationForm(
                                            e.target.checked
                                        );
                                        if (!e.target.checked) {
                                            setCopyLimits(false);
                                        }
                                    }}
                                />
                            }
                            label={`Zkopírovat registrační formulář (${inventory.registrationForm.fieldCount} polí, ${inventory.registrationForm.tierCount} cenových úrovní, ${inventory.registrationForm.pricingDefinitionCount} ceníků)`}
                        />
                        <Box sx={{ ml: 4 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={
                                            copyRegistrationForm && copyLimits
                                        }
                                        disabled={!copyRegistrationForm}
                                        onChange={(e) =>
                                            setCopyLimits(e.target.checked)
                                        }
                                    />
                                }
                                label={`Včetně limitů kapacity (${inventory.registrationForm.capacityLimitCount})`}
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>
            )}

            {inventory.sourceYear.hasSuccessContent && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={copySuccessContent}
                            onChange={(e) =>
                                setCopySuccessContent(e.target.checked)
                            }
                        />
                    }
                    label="Zkopírovat úvodní text po registraci"
                />
            )}

            <input
                type="hidden"
                name="selection"
                value={JSON.stringify(selection)}
            />
        </>
    );
}

export function YearNewForm({ years }: YearNewFormProps) {
    const [state, formAction] = useActionState<YearActionState, FormData>(
        createYear,
        null
    );

    const [startDate, setStartDate] = useState<Dayjs | null>(null);
    const [endDate, setEndDate] = useState<Dayjs | null>(null);
    const [headerPhoto, setHeaderPhoto] = useState("");
    const [heroPhoto, setHeroPhoto] = useState("");
    const [sourceYearId, setSourceYearId] = useState<string | null>(null);
    const [inventory, setInventory] = useState<YearCopyInventory | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSourceChange = async (id: string) => {
        if (!id) {
            setSourceYearId(null);
            setInventory(null);
            return;
        }
        setSourceYearId(id);
        setInventory(null);
        setLoading(true);
        try {
            const inv = await loadYearCopyInventory(id);
            if (inv) {
                setInventory(inv);
            } else {
                setSourceYearId(null);
            }
        } catch {
            setSourceYearId(null);
            setInventory(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <Box component="form" action={formAction} noValidate>
                <CardContent
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                    }}
                >
                    {state?.error?._form && (
                        <Alert severity="error">{state.error._form[0]}</Alert>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                            },
                            gap: 3,
                        }}
                    >
                        <TextField
                            required
                            fullWidth
                            id="year"
                            name="year"
                            label="Rok"
                            type="number"
                            error={!!state?.error?.year}
                            helperText={state?.error?.year?.[0]}
                            inputProps={{ min: 2000, max: 2100 }}
                        />

                        <TextField
                            required
                            fullWidth
                            id="title"
                            name="title"
                            label="Název ročníku"
                            error={!!state?.error?.title}
                            helperText={state?.error?.title?.[0]}
                            placeholder="např. Helmáč 2025"
                        />
                    </Box>

                    <TextField
                        fullWidth
                        id="subtitle"
                        name="subtitle"
                        label="Podtitulek"
                        error={!!state?.error?.subtitle}
                        helperText={state?.error?.subtitle?.[0]}
                        placeholder="např. Téma ročníku nebo popis"
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                            },
                            gap: 3,
                        }}
                    >
                        <Box>
                            <DatePicker
                                label="Datum začátku"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                format="DD.MM.YYYY"
                                slotProps={{
                                    textField: {
                                        required: true,
                                        fullWidth: true,
                                        error: !!state?.error?.startDate,
                                        helperText:
                                            state?.error?.startDate?.[0],
                                    },
                                }}
                            />
                            <input
                                type="hidden"
                                name="startDate"
                                value={startDate?.format("YYYY-MM-DD") ?? ""}
                            />
                        </Box>

                        <Box>
                            <DatePicker
                                label="Datum konce"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                format="DD.MM.YYYY"
                                slotProps={{
                                    textField: {
                                        required: true,
                                        fullWidth: true,
                                        error: !!state?.error?.endDate,
                                        helperText: state?.error?.endDate?.[0],
                                    },
                                }}
                            />
                            <input
                                type="hidden"
                                name="endDate"
                                value={endDate?.format("YYYY-MM-DD") ?? ""}
                            />
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Foto záhlaví podstránek
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 1 }}
                        >
                            Obrázek na pozadí záhlaví veřejných podstránek
                            (Program, Pravidla, Galerie, apod.)
                        </Typography>
                        <ImageUploader
                            value={headerPhoto}
                            onChange={setHeaderPhoto}
                        />
                        <input
                            type="hidden"
                            name="headerPhoto"
                            value={headerPhoto}
                        />
                        {state?.error?.headerPhoto && (
                            <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5 }}
                            >
                                {state.error.headerPhoto[0]}
                            </Typography>
                        )}
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Foto hlavní sekce
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 1 }}
                        >
                            Obrázek na pozadí úvodní sekce domovské stránky
                        </Typography>
                        <ImageUploader
                            value={heroPhoto}
                            onChange={setHeroPhoto}
                        />
                        <input
                            type="hidden"
                            name="heroPhoto"
                            value={heroPhoto}
                        />
                        {state?.error?.heroPhoto && (
                            <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5 }}
                            >
                                {state.error.heroPhoto[0]}
                            </Typography>
                        )}
                    </Box>

                    <Box>
                        <FormControl fullWidth>
                            <InputLabel id="source-year-label">
                                Zkopírovat obsah z ročníku
                            </InputLabel>
                            <Select
                                labelId="source-year-label"
                                label="Zkopírovat obsah z ročníku"
                                value={sourceYearId ?? ""}
                                onChange={(e) =>
                                    handleSourceChange(e.target.value)
                                }
                            >
                                <MenuItem value="">
                                    — Nezkopírovat (prázdný ročník) —
                                </MenuItem>
                                {years.map((y) => (
                                    <MenuItem key={y.id} value={y.id}>
                                        {y.year} – {y.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <input
                            type="hidden"
                            name="sourceYearId"
                            value={sourceYearId ?? ""}
                        />
                    </Box>

                    {loading && <CircularProgress />}

                    {sourceYearId && inventory && (
                        <ReuseSection
                            key={sourceYearId}
                            inventory={inventory}
                            anchorStartDateError={
                                state?.error?.anchorStartDate?.[0]
                            }
                        />
                    )}
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                    <SubmitButton />
                    <LinkButton href="/admin/rocniky">Zrušit</LinkButton>
                </CardActions>
            </Box>
        </Card>
    );
}
