import { z } from "zod";

export const LoginSchema = z.object({
  deped_email: z
    .string()
    .min(1, "DepEd email is required")
    .email("Invalid DepEd email format"),
  password: z
    .string()
    .min(1, "Password is required")
});

export const RegisterSchema = z.object({
  deped_email: z
    .string()
    .min(1, "DepEd email is required")
    .email("Invalid DepEd email format")
    .refine(
      (email) => email.endsWith("@deped.gov.ph") || email.endsWith(".deped.gov.ph"),
      { message: "Must end with @deped.gov.ph" }
    ),
  password: z
    .string()
    .min(1, "Password is required"),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name cannot exceed 100 characters"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name cannot exceed 100 characters"),
  position: z
    .string()
    .min(1, "Position is required")
    .max(100, "Position cannot exceed 100 characters"),
  region_id: z
    .string()
    .min(1, "Region is required"),
  division_id: z
    .string()
    .min(1, "Division office is required"),
  passcode: z
    .string()
    .min(1, "Passcode is required")
    .regex(/^\d{6}$/, "Passcode must be exactly 6 numeric digits")
});
