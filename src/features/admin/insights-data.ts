import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/auth/admin";

type ServiceDB = ReturnType<typeof createSupabaseServiceClient>;

/**
 * Like every reader in ./data, each function proves the caller is an administrator
 * before touching the service client (which bypasses RLS).
 */
async function ownerNames(supabase: ServiceDB, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("user_id,display_name").in("user_id", [...new Set(ids)]);
  for (const p of data ?? []) map.set(p.user_id, p.display_name || "Vendeur");
  return map;
}

const hasNumber = (value: string | null) => Boolean(value && value.replace(/\D/g, "").length >= 8);

export type StoreRef = { id: string; name: string; slug: string; ownerName: string; ownerId: string };
export type AdminHealth = {
  publishedWithoutWhatsapp: StoreRef[];
  storesWithoutProducts: (StoreRef & { status: "draft" | "published" })[];
  readyButDraft: StoreRef[];
  accountsWithoutStore: number;
  zeroPriceProducts: { id: string; name: string; storeName: string }[];
  newFeedback: number | null;
};

/**
 * What needs the owner's attention, in the order it costs sellers money: shops that
 * cannot take orders, shops that are empty, shops ready but never published.
 */
export async function getAdminHealth(): Promise<AdminHealth> {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const [{ data: stores }, { data: products }, { data: profiles }, feedbackCount] = await Promise.all([
    supabase.from("stores").select("id,owner_id,name,slug,status,whatsapp"),
    supabase.from("products").select("id,store_id,name,price,is_available"),
    supabase.from("profiles").select("user_id"),
    supabase.from("feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const owners = await ownerNames(supabase, (stores ?? []).map((s) => s.owner_id));
  const byStore = new Map<string, { total: number; visible: number }>();
  for (const p of products ?? []) {
    const entry = byStore.get(p.store_id) ?? { total: 0, visible: 0 };
    entry.total += 1;
    if (p.is_available) entry.visible += 1;
    byStore.set(p.store_id, entry);
  }
  const ref = (s: { id: string; name: string; slug: string; owner_id: string }): StoreRef => ({ id: s.id, name: s.name, slug: s.slug, ownerId: s.owner_id, ownerName: owners.get(s.owner_id) ?? "Vendeur" });
  const storeNames = new Map((stores ?? []).map((s) => [s.id, s.name]));
  const owning = new Set((stores ?? []).map((s) => s.owner_id));
  return {
    publishedWithoutWhatsapp: (stores ?? []).filter((s) => s.status === "published" && !hasNumber(s.whatsapp)).map(ref),
    storesWithoutProducts: (stores ?? []).filter((s) => !byStore.get(s.id)?.total).map((s) => ({ ...ref(s), status: s.status as "draft" | "published" })),
    readyButDraft: (stores ?? []).filter((s) => s.status === "draft" && (byStore.get(s.id)?.visible ?? 0) > 0 && hasNumber(s.whatsapp)).map(ref),
    accountsWithoutStore: (profiles ?? []).filter((p) => !owning.has(p.user_id)).length,
    zeroPriceProducts: (products ?? []).filter((p) => p.price === 0).map((p) => ({ id: p.id, name: p.name, storeName: storeNames.get(p.store_id) ?? "Boutique" })),
    newFeedback: feedbackCount.error ? null : feedbackCount.count ?? 0,
  };
}

export type AdminSubscriptionRow = { storeId: string; storeName: string; storeSlug: string; ownerName: string; planId: string; status: string; paymentStatus: string; provider: string; expiresAt: string | null; products: number; recorded: boolean };
export type AdminPaymentRow = { id: string; storeName: string; planId: string; amount: number; status: string; createdAt: string };
export type AdminPlanRow = { id: string; name: string; price: number; product_limit: number | null };

/** Subscriptions and payments as the database actually has them — no invented rows. */
export async function getAdminBilling(): Promise<{ subscriptions: AdminSubscriptionRow[]; subscriptionsAvailable: boolean; payments: AdminPaymentRow[]; paymentsAvailable: boolean; plans: AdminPlanRow[] }> {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const [{ data: stores }, { data: products }, subs, pays, { data: plans }] = await Promise.all([
    supabase.from("stores").select("id,owner_id,name,slug").order("created_at", { ascending: false }),
    supabase.from("products").select("store_id"),
    supabase.from("seller_subscriptions").select("store_id,plan_id,status,payment_status,provider,expires_at"),
    supabase.from("kkiapay_payments").select("id,store_id,plan_id,amount,status,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("subscription_plans").select("id,name,price,product_limit").order("price"),
  ]);
  const owners = await ownerNames(supabase, (stores ?? []).map((s) => s.owner_id));
  const count = new Map<string, number>();
  for (const p of products ?? []) count.set(p.store_id, (count.get(p.store_id) ?? 0) + 1);
  const subByStore = new Map((subs.data ?? []).map((s) => [s.store_id, s]));
  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
  return {
    subscriptionsAvailable: !subs.error,
    subscriptions: (stores ?? []).map((s) => {
      const sub = subByStore.get(s.id);
      return {
        storeId: s.id, storeName: s.name, storeSlug: s.slug, ownerName: owners.get(s.owner_id) ?? "Vendeur",
        // No row (or no table yet) means the shop runs on the free plan: that is what the app enforces.
        planId: sub?.plan_id ?? "free", status: sub?.status ?? "active", paymentStatus: sub?.payment_status ?? "—",
        provider: sub?.provider ?? "—", expiresAt: sub?.expires_at ?? null, products: count.get(s.id) ?? 0, recorded: Boolean(sub),
      };
    }),
    paymentsAvailable: !pays.error,
    payments: (pays.data ?? []).map((p) => ({ id: p.id, storeName: storeName.get(p.store_id) ?? "Boutique supprimée", planId: p.plan_id, amount: p.amount, status: p.status, createdAt: p.created_at })),
    plans: (plans ?? []) as AdminPlanRow[],
  };
}

export type AdminFeedbackRow = { id: string; kind: string; message: string; status: string; adminNote: string; contact: string; page: string; createdAt: string; userName: string; userEmail: string | null; userId: string; storeName: string | null; storeSlug: string | null; storeWhatsapp: string | null };

export async function getAdminFeedback(): Promise<{ rows: AdminFeedbackRow[]; available: boolean }> {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("feedback").select("id,user_id,store_id,kind,message,status,admin_note,contact,page,created_at").order("created_at", { ascending: false }).limit(300);
  if (error) return { rows: [], available: false };
  const rows = data ?? [];
  const storeIds = [...new Set(rows.map((r) => r.store_id).filter(Boolean))] as string[];
  const [names, storesResult, authUsers] = await Promise.all([
    ownerNames(supabase, rows.map((r) => r.user_id)),
    storeIds.length ? supabase.from("stores").select("id,name,slug,whatsapp").in("id", storeIds) : Promise.resolve({ data: [] as { id: string; name: string; slug: string; whatsapp: string | null }[] }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const emails = new Map((authUsers.data?.users ?? []).map((u) => [u.id, u.email ?? null]));
  const storeById = new Map((storesResult.data ?? []).map((s) => [s.id, s]));
  return {
    available: true,
    rows: rows.map((r) => {
      const store = r.store_id ? storeById.get(r.store_id) : undefined;
      return {
        id: r.id, kind: r.kind, message: r.message, status: r.status, adminNote: r.admin_note ?? "", contact: r.contact ?? "", page: r.page ?? "",
        createdAt: r.created_at, userId: r.user_id, userName: names.get(r.user_id) ?? "Vendeuse", userEmail: emails.get(r.user_id) ?? null,
        storeName: store?.name ?? null, storeSlug: store?.slug ?? null, storeWhatsapp: store?.whatsapp ?? null,
      };
    }),
  };
}
