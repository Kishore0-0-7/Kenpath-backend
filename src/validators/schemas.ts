import { z } from "zod";

export const TimeSlotEnum = z.enum([
  "MORNING_FASTING",
  "AFTER_BREAKFAST",
  "AFTER_LUNCH",
  "AFTER_DINNER",
]);

export type TimeSlot = z.infer<typeof TimeSlotEnum>;

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  MORNING_FASTING: "Morning (fasting)",
  AFTER_BREAKFAST: "After breakfast",
  AFTER_LUNCH: "After lunch",
  AFTER_DINNER: "After dinner",
};

export const TIME_SLOT_DISPLAY_NAMES: Record<TimeSlot, string> = {
  MORNING_FASTING: "morning (fasting)",
  AFTER_BREAKFAST: "after breakfast",
  AFTER_LUNCH: "after lunch",
  AFTER_DINNER: "after dinner",
};

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const CreateReadingSchema = z.object({
  readingDate: z
    .string({ required_error: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  timeSlot: TimeSlotEnum,
  glucoseValue: z
    .any()
    .refine((val) => val !== undefined && val !== null && val !== "", {
      message: "Please enter a glucose value.",
    })
    .refine(
      (val) => {
        const num = typeof val === "string" ? Number(val) : val;
        return typeof num === "number" && !isNaN(num) && Number.isInteger(num) && num >= 40 && num <= 600;
      },
      {
        message: "Value must be between 40 and 600 mg/dl.",
      }
    )
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val as number)),
});

export const UpdateReadingSchema = z.object({
  readingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  timeSlot: TimeSlotEnum.optional(),
  glucoseValue: z
    .any()
    .optional()
    .refine((val) => val === undefined || (val !== null && val !== ""), {
      message: "Please enter a glucose value.",
    })
    .refine(
      (val) => {
        if (val === undefined) return true;
        const num = typeof val === "string" ? Number(val) : val;
        return typeof num === "number" && !isNaN(num) && Number.isInteger(num) && num >= 40 && num <= 600;
      },
      {
        message: "Value must be between 40 and 600 mg/dl.",
      }
    )
    .transform((val) => (val !== undefined ? (typeof val === "string" ? parseInt(val, 10) : val as number) : undefined)),
});

export const ReadingParamsSchema = z.object({
  id: z.string().uuid("Invalid reading ID"),
});

export const ReadingQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ReportQuerySchema = z.object({
  date: z.string({ required_error: "Date query parameter is required" }).regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Invalid date format. Expected YYYY-MM-DD"
  ),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateReadingInput = z.infer<typeof CreateReadingSchema>;
export type UpdateReadingInput = z.infer<typeof UpdateReadingSchema>;
export type ReadingQuery = z.infer<typeof ReadingQuerySchema>;
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
