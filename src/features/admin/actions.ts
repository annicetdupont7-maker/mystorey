"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { roleChangeSchema } from "./schemas";
import { feedbackStatusSchema } from "@/features/feedback/schemas";

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

export async function updateFeedbackStatus(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = feedbackStatusSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? ""),
    adminNote: String(formData.get("adminNote") ?? ""),
  });
  if (!parsed.success) return { error: "Formulaire invalide." };
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("feedback").update({ status: parsed.data.status, admin_note: parsed.data.adminNote }).eq("id", parsed.data.id);
  if (error) return { error: "Impossible de mettre à jour ce message." };
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  return { success: "Suivi enregistré ✓" };
}