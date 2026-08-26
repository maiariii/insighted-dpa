import { z } from "zod";

export const InterventionCreateSchema = z.object({
  area_of_concern: z
    .string()
    .min(1, "Area of concern is required")
    .max(255, "Area of concern cannot exceed 255 characters"),
  intervention_to_undertake: z
    .string()
    .min(1, "Intervention to undertake is required"),
  responsible_office: z
    .string()
    .min(1, "Responsible office is required")
    .max(255, "Responsible office cannot exceed 255 characters"),
  target_date: z
    .string()
    .min(1, "Target date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid target date format. Must be a valid ISO date string."
    }),
  expected_outcomes: z
    .union([z.array(z.any()), z.record(z.any())])
    .optional(),
  remarks: z
    .union([z.array(z.any()), z.record(z.any())])
    .optional()
});
