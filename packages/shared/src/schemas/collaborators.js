import { z } from "zod";

export const CollaboratorInviteSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  first_name: z
    .string()
    .min(1, "First name is required"),
  last_name: z
    .string()
    .min(1, "Last name is required"),
  position: z
    .string()
    .optional()
    .or(z.string().min(1)),
  region_id: z
    .string()
    .optional(),
  division_id: z
    .string()
    .optional()
});
