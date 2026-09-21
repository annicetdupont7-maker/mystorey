import { z } from "zod";

/**
 * Sellers type prices the way they write them: "8500", "8 500", "8.500". Separators are
 * dropped before validation. Zero is refused: a "0 FCFA" product on a storefront is
 * always a forgotten price, and it read as broken to clients.
 */
export const priceSchema = z
  .string()
  .trim()
  .min(1, "Le prix est requis.")
  .transform((value) => value.replace(/[\s.,\u00A0\u202F]/g, "").replace(/(fcfa|cfa|f)$/i, ""))
  .refine((value) => /^\d+$/.test(value), "Prix invalide : écrivez seulement des chiffres, ex. 8500.")
  .transform((value) => Number(value))
  .refine((n) => Number.isSafeInteger(n) && n >= 1, "Indiquez un prix supérieur à 0.")
  .refine((n) => n <= 100_000_000, "Prix trop élevé.");

/** Empty = stock not tracked (unlimited); otherwise a whole number of pieces. */
export const stockFieldSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.replace(/\s/g, "") : ""))
  .refine((value) => value === "" || /^\d+$/.test(value), "Stock invalide : un nombre entier, ou laissez vide.")
  .transform((value) => (value === "" ? null : Number(value)))
  .refine((value) => value === null || value <= 1_000_000, "Stock trop élevé.");

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom à votre produit.").max(100, "100 caractères maximum."),
  note: z.string().trim().max(120, "120 caractères maximum.").optional().default(""),
  description: z.string().trim().max(1000, "1000 caractères maximum.").optional().default(""),
  price: priceSchema,
  categoryId: z.string().trim().optional().transform((v) => (v ? v : null)),
  isAvailable: z.literal("on").optional().nullable().transform((v) => v === "on"),
  isFeatured: z.literal("on").optional().nullable().transform((v) => v === "on"),
});
export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductActionState = { error?: string; fieldErrors?: Record<string, string[]> };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_GALLERY_BYTES = 4.5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * The order of the photos as the seller arranged them: each token is an existing photo
 * (by storage path), the legacy single image, or the n-th newly uploaded file.
 */
export type PhotoToken = { kind: "existing"; path: string } | { kind: "legacy" } | { kind: "new"; index: number };

export function parsePhotoOrder(raw: unknown): PhotoToken[] | null {
  if (typeof raw !== "string" || raw === "") return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(value)) return null;
  const tokens: PhotoToken[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (item === "legacy") tokens.push({ kind: "legacy" });
    else if (item.startsWith("existing:") && item.length > 9) tokens.push({ kind: "existing", path: item.slice(9) });
    else if (/^new:\d{1,2}$/.test(item)) tokens.push({ kind: "new", index: Number(item.slice(4)) });
  }
  return tokens;
}
