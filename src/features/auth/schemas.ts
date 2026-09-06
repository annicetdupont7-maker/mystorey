import { z } from "zod";
export const passwordFieldSchema = z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128);
export const credentialsSchema = z.object({ displayName: z.string().trim().min(2, "Indiquez votre prénom ou nom.").max(80).optional(), email: z.email("Adresse email invalide.").trim(), password: passwordFieldSchema });
export const loginSchema = credentialsSchema.pick({ email: true, password: true });
export const emailSchema = credentialsSchema.pick({ email: true });
export const updatePasswordSchema = z.object({ password: passwordFieldSchema, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { message: "Les mots de passe ne correspondent pas.", path: ["confirmPassword"] });
export type ActionState = { error?: string; success?: string; reason?: string; email?: string; fieldErrors?: Record<string, string[]> };