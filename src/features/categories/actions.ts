"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categoryFormSchema, categoryRenameSchema, type CategoryActionState } from "./schemas";

type CategoryClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function confirmStoreOwner(supabase: CategoryClient, storeId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", user.id).limit(1).maybeSingle();
  return !!data;
}

export async function createCategory(_: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const parsed = categoryFormSchema.safeParse({ storeId: String(formData.get("storeId") ?? ""), name: String(formData.get("name") ?? "") });
  if (!parsed.success) return { error: "Vérifiez le nom de la catégorie.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };
  if (!(await confirmStoreOwner(supabase, parsed.data.storeId))) return { error: "Boutique introuvable." };
  const { error } = await supabase.from("categories").insert({ store_id: parsed.data.storeId, name: parsed.data.name });
  if (error) return { error: "Impossible de créer la catégorie. Réessayez." };
  return { success: "Catégorie créée ✓" };
}

export async function renameCategory(_: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const parsed = categoryRenameSchema.safeParse({ storeId: String(formData.get("storeId") ?? ""), categoryId: String(formData.get("categoryId") ?? ""), name: String(formData.get("name") ?? "") });
  if (!parsed.success) return { error: "Vérifiez le nom de la catégorie.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };
  if (!(await confirmStoreOwner(supabase, parsed.data.storeId))) return { error: "Boutique introuvable." };
  const { data: renamed, error } = await supabase.from("categories").update({ name: parsed.data.name }).eq("id", parsed.data.categoryId).eq("store_id", parsed.data.storeId).select("id");
  if (error || !renamed || renamed.length === 0) return { error: "Impossible de renommer la catégorie." };
  return { success: "Catégorie modifiée ✓" };
}

export async function deleteCategory(_: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const storeId = String(formData.get("storeId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!storeId || !categoryId) return { error: "Requête invalide." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };
  if (!(await confirmStoreOwner(supabase, storeId))) return { error: "Boutique introuvable." };
  // On ne supprime jamais les produits : la catégorie est d'abord retirée des produits,
  // puis la catégorie est supprimée. (FK on delete set null en filet de sécurité.)
  const { error: unassignError } = await supabase.from("products").update({ category_id: null }).eq("category_id", categoryId).eq("store_id", storeId);
  if (unassignError) return { error: "Impossible de retirer la catégorie des produits." };
  const { data: deleted, error } = await supabase.from("categories").delete().eq("id", categoryId).eq("store_id", storeId).select("id");
  if (error || !deleted || deleted.length === 0) return { error: "Impossible de supprimer la catégorie." };
  return { success: "Catégorie supprimée ✓" };
}