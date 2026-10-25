import { z } from "zod";
import { Role } from "@prisma/client";
import {
  PASSWORD_MIN_LENGTH,
  getFailedPasswordRules,
} from "../domain/password-rules";

export const ROLE_VALUES = [
  "ADMIN",
  "COACH",
  "AD_HOC_COACH",
  "PLAYER",
  "PARENT",
] as const satisfies readonly Role[];

export const ParentSlotInputSchema = z.object({
  mode: z.enum(["EXISTING", "NEW"]),
  existingProfileId: z.string().uuid().optional().or(z.literal("")),
  relationship: z.string().trim().max(50).optional().or(z.literal("")),
  // For new parent
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
});

export type ParentSlotInput = z.infer<typeof ParentSlotInputSchema>;

/**
 * Validates member profile creation input from the Admin UI.
 * Message strings are dictionary lookup keys so UI renders them localized.
 */
export const CreateMemberProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(100, "validation.tooLong"),
  lastName: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(100, "validation.tooLong"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("validation.invalidEmail")
    .max(254, "validation.tooLong")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(50, "validation.tooLong")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "validation.invalidDate")
    .optional()
    .or(z.literal("")),
  roles: z
    .array(z.enum(ROLE_VALUES))
    .min(1, "validation.rolesRequired"),
  grantLoginAccess: z.boolean().default(false),
  parent1: ParentSlotInputSchema.optional(),
  parent2: ParentSlotInputSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.roles.includes("PLAYER") && (!data.dateOfBirth || data.dateOfBirth === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "admin.errors.PLAYER_REQUIRES_DOB",
      path: ["dateOfBirth"],
    });
  }
});

export type CreateMemberProfileInput = z.infer<typeof CreateMemberProfileSchema>;

export const SignInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "auth.errors.invalidCredentials"),
  password: z
    .string()
    .min(1, "auth.errors.invalidCredentials"),
});

export type SignInInput = z.infer<typeof SignInSchema>;

/**
 * Validates mandatory password reset submissions.
 * Issues custom issues for each unsatisfied PasswordRule code so the UI
 * can highlight failing rules individually.
 */
export const ResetPasswordSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const failed = getFailedPasswordRules(data.password);
    for (const rule of failed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `auth.passwordRules.${rule}`,
        path: ["password"],
      });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.errors.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
