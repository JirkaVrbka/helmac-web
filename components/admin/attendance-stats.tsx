import {
    Box,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { HowToReg } from "@mui/icons-material";
import type { InputField, PricingDefinition } from "@/lib/types/registration-form";
import type { V2OptionCountsResult } from "@/lib/services/v2";
import { getFieldOptionValues } from "@/lib/utils/pricing";

interface AttendanceStatsProps {
    totalPeople: number;
    attendingPeople: number;
    totalCounts: V2OptionCountsResult;
    attendingCounts: V2OptionCountsResult;
    fields: InputField[];
    pricingDefinitions: PricingDefinition[];
}

export function AttendanceStats({
    totalPeople,
    attendingPeople,
    totalCounts,
    attendingCounts,
    fields,
    pricingDefinitions,
}: AttendanceStatsProps) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Card>
                <CardContent
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                    }}
                >
                    <HowToReg
                        sx={{
                            fontSize: 40,
                            color: "success.main",
                        }}
                    />
                    <Box>
                        <Typography variant="h4">
                            {attendingPeople} / {totalPeople}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            účastníků přijelo
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {fields.length === 0 ? (
                <Typography
                    color="text.secondary"
                    sx={{ py: 4, textAlign: "center" }}
                >
                    Formulář zatím nemá žádné položky.
                </Typography>
            ) : (
                fields.map((field) => {
                    const options = getFieldOptionValues(
                        field,
                        pricingDefinitions,
                    );
                    if (options.length === 0) return null;

                    const fieldTotal =
                        totalCounts[field.name]?.counts ?? {};
                    const fieldAttending =
                        attendingCounts[field.name]?.counts ?? {};

                    return (
                        <Card key={field.name}>
                            <CardContent
                                sx={{
                                    p: 0,
                                    "&:last-child": { pb: 0 },
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 600,
                                        px: 2,
                                        pt: 2,
                                        pb: 1,
                                    }}
                                >
                                    {field.label}
                                </Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    Položka
                                                </TableCell>
                                                <TableCell align="right">
                                                    Přihlášeno
                                                </TableCell>
                                                <TableCell align="right">
                                                    Přijelo
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {options.map(
                                                (option) => (
                                                    <TableRow
                                                        key={option}
                                                    >
                                                        <TableCell>
                                                            {option}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {fieldTotal[
                                                                option
                                                            ] ?? 0}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {fieldAttending[
                                                                option
                                                            ] ?? 0}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </Box>
    );
}
