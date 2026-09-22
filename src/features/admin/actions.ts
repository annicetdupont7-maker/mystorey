"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { accountRefSchema, emailChangeSchema, roleChangeSchema } from "./schemas";
import { originFromHeaders } from "@/lib/app-url";
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

export type ResetLinkState = { error?: string; link?: string };

/**
 * A password-reset link the owner sends to a seller on WhatsApp. MYSTOREY does not rely
 * on email (sellers live on WhatsApp, and auth emails were never reliable), so this is
 * the way back in for someone who forgot her password. Nothing is emailed: the link is
 * only shown to the admin. It opens /auth/callback, which verifies it server-side.
 */
export async function generatePasswordResetLink(_: ResetLinkState, formData: FormData): Promise<ResetLinkState> {
  const parsed = accountRefSchema.safeParse({ userId: String(formData.get("userId") ?? "") });
  if (!parsed.success) return { error: "Compte introuvable." };
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data: found } = await supabase.auth.admin.getUserById(parsed.data.userId);
  const email = found?.user?.email;
  if (!email) return { error: "Ce compte n’a pas d’adresse email." };
  const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
  const token = data?.properties?.hashed_token;
  if (error || !token) return { error: "Impossible de générer le lien. Réessayez." };
  const origin = originFromHeaders(await headers());
  return { link: `${origin}/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery` };
}

/** Fix a mistyped address (the account keeps its password, shop and orders). */
export async function updateUserEmail(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = emailChangeSchema.safeParse({ userId: String(formData.get("userId") ?? ""), email: String(formData.get("email") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.updateUserById(parsed.data.userId, { email: parsed.data.email, email_confirm: true });
  if (error) {
    if (error.code === "email_exists" || /already/i.test(error.message)) return { error: "Cette adresse est déjà utilisée par un autre compte." };
    return { error: "Impossible de modifier l’adresse. Réessayez." };
  }
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/admin/users");
  return { success: `Adresse mise à jour : ${parsed.data.email}. Le compte se connecte désormais avec elle.` };
}
