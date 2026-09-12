import { z } from "zod";

/** Blank numeric fields mean "not set" (inherit / not tracked), not zero. */
const optionalPositiveInt = (max: number, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^\d+$/.test(value), message)
    .transform((value) => (value === null ? null : Number(value)))
    .refine((value) => value === null || (Number.isSafeInteger(value) && value <= max), message);

export const variantSchema = z.object({
  productId: z.string().min(1),
  optionGroup: z.string().trim().min(1, "Nommez le choix (Couleur, Taille…).").max(30, "30 caractères maximum."),
  label: z.string().trim().min(1, "Donnez un nom à cette option.").max(40, "40 caractères maximum."),
  price: optionalPositiveInt(100_000_000, "Prix invalide."),
  stock: optionalPositiveInt(1_000_000, "Stock invalide."),
});

export const productStockSchema = optionalPositiveInt(1_000_000, "Stock invalide.");

export type VariantActionState = { error?: string; success?: string; fieldErrors?: Record<string, string[]> };
