import { z } from "zod";
import { ACCURACY_CLASSES } from "./oimlHelpers";

// Shared by the forms and the API routes so both sides agree on what's valid.

// Empty inputs arrive as "" which would coerce to 0; treat them as missing instead.
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const num = (message: string) => z.preprocess(blankToUndefined, z.coerce.number({ message }));

const positive = (label: string) =>
  z.preprocess(blankToUndefined, z.coerce.number({ message: `${label} is required` }).positive(`${label} must be greater than 0`));

export const instrumentSchema = z
  .object({
    manufacturer: z.string().trim().min(1, "Manufacturer is required"),
    model: z.string().trim().min(1, "Model is required"),
    serialNumber: z.string().trim().min(1, "Serial number is required"),
    accuracyClass: z.enum(ACCURACY_CLASSES),
    maxCapacity: positive("Max"),
    minCapacity: positive("Min"),
    scaleIntervalE: positive("e"),
    scaleIntervalD: positive("d"),
    capacity: positive("Capacity"),
  })
  .refine((v) => v.minCapacity < v.maxCapacity, {
    path: ["minCapacity"],
    message: "Min has to be smaller than Max",
  })
  .refine((v) => v.scaleIntervalD <= v.scaleIntervalE, {
    path: ["scaleIntervalD"],
    message: "d can't be larger than e (R 76-1, 3.4.2)",
  })
  .refine((v) => v.scaleIntervalE < v.maxCapacity, {
    path: ["scaleIntervalE"],
    message: "e looks too large for this Max",
  });

export type InstrumentInput = z.input<typeof instrumentSchema>;

export const conditionsSchema = z.object({
  temperature: z.preprocess(blankToUndefined, z.coerce.number({ message: "Required" }).min(-10, "Below -10 °C").max(40, "Above 40 °C")),
  humidity: z.preprocess(blankToUndefined, z.coerce.number({ message: "Required" }).min(0, "Can't be below 0 %").max(100, "Can't exceed 100 %")),
  pressure: z.preprocess(blankToUndefined, z.coerce.number({ message: "Required" }).min(800, "Below 800 hPa").max(1100, "Above 1100 hPa")),
});

export const reportSchema = conditionsSchema.extend({
  instrumentId: z.string().min(1, "Pick an instrument"),
  testerName: z.string().trim().min(1, "Tester name is required"),
});

export type ReportInput = z.input<typeof reportSchema>;

export const observationSchema = z.object({
  testType: z.enum(["Repeatability", "Eccentricity", "WeighingPerformance", "Tare"]),
  load: num("Load is required").pipe(z.number().min(0)),
  indication: num("Indication is required"),
  position: z.string().trim().max(40).nullish(),
  tareValue: z.coerce.number().min(0).nullish(),
});

export const ZERO_TRACKING = {
  NonExistent: "Non-existent",
  NotInOperation: "Not in operation",
  OutOfRange: "Out of working range",
  InOperation: "In operation",
} as const;

export const completeSchema = z.object({
  temperatureEnd: conditionsSchema.shape.temperature,
  humidityEnd: conditionsSchema.shape.humidity,
  pressureEnd: conditionsSchema.shape.pressure,
  zeroTracking: z.enum(Object.keys(ZERO_TRACKING) as [keyof typeof ZERO_TRACKING, ...(keyof typeof ZERO_TRACKING)[]]),
  remarks: z.string().trim().max(500).optional(),
});

// Turn a ZodError into { field: "first message" } for the API response
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
