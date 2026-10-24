import { z } from "zod";

export const CreateMemberProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().datetime().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  roles: z.array(z.enum(["ADMIN", "COACH", "AD_HOC_COACH", "PLAYER", "PARENT"])).min(1, "At least one role is required"),
  grantLoginAccess: z.boolean().default(false),
});

export const ResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one symbol"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const PrivacySettingsSchema = z.object({
  showEmailInDirectory: z.boolean(),
  showPhoneInDirectory: z.boolean(),
  showAddressInDirectory: z.boolean(),
});
