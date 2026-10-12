import "@/lib/zod-setup";
import { z } from "zod";

/**
 * The backend's password policy (app/schemas/auth.py validate_password_policy): 12 to 128
 * characters with at least one letter and one number.
 */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { id: "letter", label: "At least one letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "At least one number", test: (v: string) => /[0-9]/.test(v) },
] as const;

export const newPasswordSchema = z
  .string()
  .max(128, { error: "Use 128 characters or fewer." })
  .refine((v) => PASSWORD_RULES.every((rule) => rule.test(v)), {
    error: "Choose a password with at least 12 characters, a letter and a number.",
  });
