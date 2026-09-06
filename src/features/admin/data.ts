import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { buildActivityFeed, computeAdminStats } from "./stats";
import type { ActivityItem, AdminOrderRow, AdminProductRow, AdminStats, AdminStoreRow, AdminUserRow } from "./types";

type ServiceDB = ReturnType<typeof createSupabaseServiceClient>;

const PAGES_MAX = 1000;

export async function getAdminUsers(): Promise<{ users: AdminUserRow[]; error?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: authResult, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: PAGES_MAX });
  if (authError || !authResult?.users) return { users: [], error: "Impossible de charger les utilisateurs." };
  const users = authResult.users;
  const ids = users.map((u) => u.id);
  const { data: profiles } = await supabase.from("profiles").select("user_id,display_name,role").in("user_id", ids);
  const { data: stores } = await supabase.from("stores").select("owner_id");
  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const storeCount = (ownerId: string) => (stores ?? []).filter((s) => s.owner_id === ownerId).length;
  const rows: AdminUserRow[] = users.map((u) => {
    const profile = profileByUser.get(u.id);
    const meta = (u.user_metadata ?? {}) as { display_name?: string };
    const name = profile?.display_name || meta.display_name || u.email?.split("@")[0] || "Utilisateur";
    return {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone || null,
      name,
      role: profile?.role ?? null,
      roleSet: Boolean(profile && "role" in profile && profile.role),
      created_at: u.created_at ?? null,
      banned: Boolean(u.banned_until),
      active: Boolean(u.email_confirmed_at),
      stores: storeCount(u.id),
    };
  });
  return { users: rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")) };
}

type StoreRef = { id: string; name: string; slug: string };

export async function getAdminStores(): Promise<{ stores: AdminStoreRow[]; error?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: raw, error } = await supabase
    .from("stores")
    .select("id,owner_id,name,slug,status,created_at,whatsapp")
    .order("created_at", { ascending: false });
  if (error || !raw) return { stores: [], error: "Impossible de charger les boutiques." };
  return { stores: await decorateStores(supabase, raw) };
}

export async function getAdminProducts(): Promise<{ products: AdminProductRow[]; error?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: raw, error } = await supabase
    .from("products")
    .select("id,store_id,name,note,price,is_available,is_featured,created_at,image_url")
    .order("created_at", { ascending: false });
  if (error || !raw) return { products: [], error: "Impossible de charger les produits." };
  const { storesById } = await loadStoreAndOwnerMaps(supabase, raw.map((p) => p.store_id));
  return { products: raw.map((p) => ({ id: p.id, store_id: p.store_id, storeName: storesById.get(p.store_id)?.name ?? "Boutique inconnue", storeSlug: storesById.get(p.store_id)?.slug ?? "", ownerName: storesById.get(p.store_id)?.ownerName ?? "Vendeur inconnu", name: p.name, note: p.note, price: p.price, is_available: p.is_available, is_featured: p.is_featured, created_at: p.created_at, image_url: p.image_url })) };
}

export async function getAdminOrders(): Promise<{ orders: AdminOrderRow[]; error?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: raw, error } = await supabase
    .from("orders")
    .select("id,store_id,order_number,customer_name,customer_phone,customer_address,total,status,note,items,created_at")
    .order("created_at", { ascending: false });
  if (error || !raw) return { orders: [], error: "Impossible de charger les commandes." };
  const { storesById } = await loadStoreAndOwnerMaps(supabase, raw.map((o) => o.store_id));
  return {
    orders: raw.map((o) => ({
      id: o.id,
      store_id: o.store_id,
      storeName: storesById.get(o.store_id)?.name ?? "Boutique inconnue",
      storeSlug: storesById.get(o.store_id)?.slug ?? "",
      ownerName: storesById.get(o.store_id)?.ownerName ?? "Vendeur inconnu",
      order_number: o.order_number,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      total: o.total,
      status: o.status,
      note: o.note,
      created_at: o.created_at,
      items: o.items ?? [],
    })),
  };
}

export async function getAdminDashboard(): Promise<{ stats: AdminStats; recentOrders: AdminOrderRow[]; activity: ActivityItem[]; error?: string }> {
  const supabase = createSupabaseServiceClient();
  const { users, error } = await getAdminUsers();
  const { data: profiles } = await supabase.from("profiles").select("role");
  const { data: stores } = await supabase.from("stores").select("status");
  const { data: orders } = await supabase.from("orders").select("status,total");
  const { count: productsCount } = await supabase.from("products").select("id", { count: "exact", head: true });
  if (error) return { stats: emptyStats(), recentOrders: [], activity: [], error };
  const stats = computeAdminStats({
    profiles: (profiles ?? []) as { role: AdminUserRow["role"] | null }[],
    stores: (stores ?? []) as { status: AdminStoreRow["status"] }[],
    orders: (orders ?? []) as { status: AdminOrderRow["status"]; total: number }[],
    productsCount: productsCount ?? 0,
  });
  const ordersRows = (await getAdminOrders()).orders;
  const activity = buildActivityFeed({
    profiles: users.map((u) => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at })),
    stores: await loadActivityStores(supabase),
    orders: ordersRows.map((o) => ({ id: o.id, order_number: o.order_number, customer_name: o.customer_name, storeName: o.storeName, created_at: o.created_at })),
  });
  return { stats, recentOrders: ordersRows.slice(0, 6), activity, error: undefined };
}

function emptyStats(): AdminStats {
  return { users: 0, sellers: 0, admins: 0, stores: 0, storesPublished: 0, storesDraft: 0, products: 0, orders: 0, ordersPending: 0, revenue: 0 };
}

async function loadActivityStores(supabase: ServiceDB): Promise<{ id: string; name: string; slug: string; created_at: string }[]> {
  const { data } = await supabase.from("stores").select("id,name,slug,created_at").order("created_at", { ascending: false }).limit(10);
  return (data ?? []) as { id: string; name: string; slug: string; created_at: string }[];
}

async function decorateStores(supabase: ServiceDB, raw: { id: string; owner_id: string; name: string; slug: string; status: "draft" | "published"; created_at: string; whatsapp: string | null }[]): Promise<AdminStoreRow[]> {
  const owners = await loadOwnerNames(supabase, raw.map((s) => s.owner_id));
  const productRefs = await supabase.from("products").select("id,store_id");
  const orderRefs = await supabase.from("orders").select("id,store_id");
  const productCount = new Map<string, number>();
  for (const p of productRefs.data ?? []) productCount.set(p.store_id, (productCount.get(p.store_id) ?? 0) + 1);
  const orderCount = new Map<string, number>();
  for (const o of orderRefs.data ?? []) orderCount.set(o.store_id, (orderCount.get(o.store_id) ?? 0) + 1);
  return raw.map((s) => ({
    id: s.id,
    owner_id: s.owner_id,
    ownerName: owners.get(s.owner_id) ?? "Vendeur inconnu",
    name: s.name,
    slug: s.slug,
    status: s.status,
    created_at: s.created_at,
    whatsapp: s.whatsapp ?? "",
    products: productCount.get(s.id) ?? 0,
    orders: orderCount.get(s.id) ?? 0,
  }));
}

type StoreAndOwner = { id: string; name: string; slug: string; owner_id: string; ownerName: string };
async function loadStoreAndOwnerMaps(supabase: ServiceDB, storeIds: string[]): Promise<{ storesById: Map<string, StoreAndOwner> }> {
  const storesById = new Map<string, StoreAndOwner>();
  if (storeIds.length === 0) return { storesById };
  const { data: stores } = await supabase.from("stores").select("id,name,slug,owner_id").in("id", storeIds);
  const owners = await loadOwnerNames(supabase, (stores ?? []).map((s) => s.owner_id));
  for (const s of stores ?? []) {
    storesById.set(s.id, { id: s.id, name: s.name, slug: s.slug, owner_id: s.owner_id, ownerName: owners.get(s.owner_id) ?? "Vendeur inconnu" });
  }
  return { storesById };
}

async function loadOwnerNames(supabase: ServiceDB, ownerIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ownerIds.length === 0) return map;
  const { data } = await supabase.from("profiles").select("user_id,display_name").in("user_id", ownerIds);
  for (const p of data ?? []) map.set(p.user_id, p.display_name || "Vendeur");
  return map;
}

export async function getAdminUserById(id: string): Promise<{ user: AdminUserRow | null; stores: AdminStoreRow[] }> {
  const supabase = createSupabaseServiceClient();
  const { data: authRes, error: authErr } = await supabase.auth.admin.getUserById(id);
  const u = authRes?.user;
  if (authErr || !u) return { user: null, stores: [] };
  const { data: profile } = await supabase.from("profiles").select("user_id,display_name,role").eq("user_id", id).maybeSingle();
  const meta = (u.user_metadata ?? {}) as { display_name?: string };
  const name = profile?.display_name || meta.display_name || u.email?.split("@")[0] || "Utilisateur";
  const { data: storeRaw } = await supabase
    .from("stores")
    .select("id,owner_id,name,slug,status,created_at,whatsapp")
    .eq("owner_id", id)
    .order("created_at");
  const stores = await decorateStores(supabase, storeRaw ?? []);
  const user: AdminUserRow = {
    id: u.id,
    email: u.email ?? null,
    phone: u.phone || null,
    name,
    role: profile?.role ?? null,
    roleSet: Boolean(profile),
    created_at: u.created_at ?? null,
    banned: Boolean(u.banned_until),
    active: Boolean(u.email_confirmed_at),
    stores: stores.length,
  };
  return { user, stores };
}

export async function getAdminStoreRefs(): Promise<StoreRef[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("stores").select("id,name,slug").order("name");
  return (data ?? []) as StoreRef[];
}