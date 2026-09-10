"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeOrderTotal, isOrderStatus, orderFormSchema, type OrderActionState, type OrderItemSnapshot } from "./schemas";
import { isValidTransition, type OrderStatus } from "./order-status";

export async function createOrder(_: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const storeId = String(formData.get("storeId") || "");
  let parsedLines: { productId: string; quantity: number }[] = [];
  try {
    const raw = String(formData.get("lines") || "[]");
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error();
    parsedLines = value;
  } catch {
    return { error: "Panier de commande invalide." };
  }
  const parsed = orderFormSchema.safeParse({ customerName: formData.get("customerName"), customerPhone: String(formData.get("customerPhone") ?? ""), customerAddress: String(formData.get("customerAddress") ?? ""), note: String(formData.get("note") ?? ""), lines: parsedLines });
  if (!parsed.success) return { error: "Vérifiez les informations de la commande.", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const { data: store } = await supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", user.id).maybeSingle();
    if (!store) return { error: "Boutique introuvable." };

    const productIds = [...new Set(parsed.data.lines.map((line) => line.productId))];
    const { data: productRows, error: productsError } = await supabase.from("products").select("id,name,price").eq("store_id", storeId).in("id", productIds);
    if (productsError) return { error: "Impossible de vérifier les produits." };
    const priceById = new Map((productRows ?? []).map((row) => [row.id, row] as const));
    if (productIds.some((productId) => !priceById.has(productId))) return { error: "Un produit de la commande est introuvable dans cette boutique." };

    const items: OrderItemSnapshot[] = parsed.data.lines.map((line) => {
      const product = priceById.get(line.productId);
      return { productId: line.productId, name: product!.name, unitPrice: product!.price, quantity: line.quantity };
    });
    const total = computeOrderTotal(items);

    const { error } = await supabase.from("orders").insert({
      store_id: storeId,
      customer_name: parsed.data.customerName,
      customer_phone: parsed.data.customerPhone,
      customer_address: parsed.data.customerAddress,
      note: parsed.data.note,
      items,
      total,
      status: "new",
    });
    if (error) return { error: "Impossible d’enregistrer la commande. Réessayez." };
    revalidatePath("/dashboard/orders");
    return { success: "Commande enregistrée ✓" };
  } catch {
    return { error: "Une erreur est survenue pendant l’enregistrement de la commande. Réessayez." };
  }
}

export async function updateOrderStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("orderId") || "");
  const raw = formData.get("status");
  if (!id || !isOrderStatus(raw)) return;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  try {
    const { data: order } = await supabase.from("orders").select("status").eq("id", id).eq("store_id", (await supabase.from("stores").select("id").eq("owner_id", user.id).limit(1).maybeSingle()).data?.id ?? "").maybeSingle();
    if (!order || !isValidTransition(order.status as OrderStatus, raw)) return;
    await supabase.from("orders").update({ status: raw }).eq("id", id).eq("store_id", (await supabase.from("stores").select("id").eq("owner_id", user.id).limit(1).maybeSingle()).data?.id ?? "");
    revalidatePath("/dashboard/orders");
  } catch {
    return;
  }
}

export async function deleteOrder(formData: FormData): Promise<void> {
  const id = String(formData.get("orderId") || "");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
  if (store) await supabase.from("orders").delete().eq("id", id).eq("store_id", store.id);
  revalidatePath("/dashboard/orders");
}