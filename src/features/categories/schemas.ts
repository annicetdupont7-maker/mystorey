import { z } from "zod";
export const categoryNameSchema = z.string().trim().min(1, "Le nom est requis.").max(60, "60 caractères maximum.");
export const categoryFormSchema = z.object({
  storeId: z.string().trim().min(1, "Boutique requise."),
  name: categoryNameSchema,
});
export const categoryRenameSchema = categoryFormSchema.extend({ categoryId: z.string().trim().min(1, "Catégorie requise.") });
export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type CategoryActionState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };