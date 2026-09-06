import { z } from "zod";
export const priceSchema = z.string().trim().min(1, "Le prix est requis.").regex(/^\d+$/, "Prix invalide.").transform((v) => Number(v)).refine((n) => Number.isSafeInteger(n) && n <= 100_000_000, "Prix trop élevé.");
export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(100, "100 caractères maximum."),
  note: z.string().trim().max(120, "120 caractères maximum.").optional().default(""),
  description: z.string().trim().max(1000, "1000 caractères maximum.").optional().default(""),
  price: priceSchema,
  categoryId: z.string().trim().optional().transform((v) => (v ? v : null)),
  isAvailable: z.literal("on").optional().nullable().transform((v) => v === "on"),
  isFeatured: z.literal("on").optional().nullable().transform((v) => v === "on")
});
export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductActionState = { error?: string; fieldErrors?: Record<string, string[]> };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;