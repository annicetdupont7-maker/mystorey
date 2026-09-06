"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { roleChangeSchema } from "./schemas";

export type AdminActionState = { error?: string; success?: string };

export async function updateUserRole(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = roleChangeSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { error: "Formulaire invalide." };
  const { userId, role } = parsed.data;
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();
  if (!profile) return { error: "Cet utilisateur n'existe plus." };
  if (profile.role === role) return { success: "Rôle déjà à jour." };
  if (role === "seller" && profile.role === "admin") {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return { error: "Vous ne pouvez pas rétrograder le dernier administrateur de la plateforme." };
  }
  const { error } = await supabase.from("profiles").update({ role }).eq("user_id", userId);
  if (error) return { error: "Impossible de mettre à jour le rôle." };
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: role === "admin" ? "Compte promu administrateur." : "Compte rétrogradé en vendeur." };
}