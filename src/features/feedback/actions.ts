"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { feedbackSchema, SUPPORT_EMAIL, type FeedbackActionState } from "./schemas";

export async function sendFeedback(_: FeedbackActionState, formData: FormData): Promise<FeedbackActionState> {
  const parsed = feedbackSchema.safeParse({
    kind: formData.get("kind"),
    message: String(formData.get("message") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    page: String(formData.get("page") ?? ""),
  });
  if (!parsed.success) return { error: "Vérifiez votre message.", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    store_id: store?.id ?? null,
    kind: parsed.data.kind,
    message: parsed.data.message,
    contact: parsed.data.contact,
    page: parsed.data.page,
  });
  if (error) {
    return { error: `Votre message n’a pas pu être envoyé. Écrivez-nous directement à ${SUPPORT_EMAIL} : nous vous répondrons.` };
  }
  revalidatePath("/dashboard/help");
  return { success: "Message envoyé ✓ Merci ! L’équipe MYSTOREY vous répond au plus vite, sur WhatsApp ou par email.", successId: Date.now() };
}
