import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackKind, FeedbackStatus } from "./schemas";

export type FeedbackRow = { id: string; kind: FeedbackKind; message: string; status: FeedbackStatus; admin_note: string; created_at: string };

/** The seller's own messages. A missing table (migration not applied) reads as "none yet". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMyFeedback(supabase: SupabaseClient<any, any, any>, userId: string): Promise<{ rows: FeedbackRow[]; available: boolean }> {
  const { data, error } = await supabase.from("feedback").select("id,kind,message,status,admin_note,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) return { rows: [], available: false };
  return { rows: (data ?? []) as FeedbackRow[], available: true };
}
