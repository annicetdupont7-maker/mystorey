"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/paginate";
import { collectStoreMedia, removeStoreMedia } from "@/features/stores/storage-cleanup";
import { DELETION_PHRASE, archiveRowsFor } from "./deletion";

export type AccountActionState = { error?: string };

// Même préfixe que le reste : un seul filtre dans les logs Vercel.
function logFailure(step: string, failure: { code?: string; status?: number; message: string }) {
  console.error("[mystorey-error]", JSON.stringify({ step, code: failure.code, status: failure.status, message: failure.message, at: new Date().toISOString() }));
}

/**
 * Suppression définitive du compte, demandée par la vendeuse elle-même.
 *
 * L'ordre des opérations n'est pas négociable, parce que `auth.users` est la racine de
 * toutes les cascades : une fois le compte supprimé, les boutiques, les produits, les
 * commandes et les abonnements sont déjà partis et plus rien n'est lisible. Donc on
 * archive, on relève les chemins des fichiers, et seulement ensuite on supprime.
 *
 * Trois refus avant d'y toucher : la phrase de confirmation, le mot de passe, et le cas
 * de la dernière administratrice. Ce dernier n'est pas de la prudence excessive :
 * MYSTOREY n'a qu'une seule administratrice, et la perdre rendrait le back-office
 * inaccessible sans repasser par le SQL Editor de Supabase.
 */
export async function deleteAccount(_: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");
  if (confirmation !== DELETION_PHRASE) return { error: `Tapez « ${DELETION_PHRASE} » exactement pour confirmer.` };
  if (!password) return { error: "Entrez votre mot de passe : il sert de signature." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Session expirée. Reconnectez-vous." };

  // Une session ouverte n'est pas une signature : un téléphone déverrouillé posé sur une
  // table suffirait à détruire la boutique. On redemande donc le mot de passe.
  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (authError) {
    if (authError.code !== "invalid_credentials") logFailure("delete-account-reauth", authError);
    return { error: "Mot de passe incorrect. Votre compte n’a pas été supprimé." };
  }

  const service = createSupabaseServiceClient();

  const { data: profile } = await service.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (profile?.role === "admin") {
    const { count } = await service.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return { error: "Vous êtes la seule administratrice de MYSTOREY. Nommez quelqu’un d’autre depuis le back-office avant de supprimer votre compte, sinon personne ne pourra plus y entrer." };
  }

  const { data: stores, error: storesError } = await service.from("stores").select("id,name,slug").eq("owner_id", user.id);
  if (storesError) {
    logFailure("delete-account-stores", storesError);
    return { error: "Impossible de lire vos boutiques pour le moment. Réessayez dans un instant." };
  }
  const storeIds = (stores ?? []).map((store) => store.id);

  if (storeIds.length) {
    const { data: orders, error: ordersError } = await selectAll<{ id: string; store_id: string; items: unknown; total: number | null; status: string | null; created_at: string }>(
      (from, to) => service.from("orders").select("id,store_id,items,total,status,created_at").in("store_id", storeIds).order("created_at", { ascending: true }).range(from, to),
    );
    if (ordersError) {
      logFailure("delete-account-orders", ordersError);
      return { error: "Impossible de lire l’historique des commandes. Votre compte n’a pas été supprimé." };
    }
    const archived = archiveRowsFor(stores ?? [], orders ?? []);
    if (archived.length) {
      const { error: archiveError } = await service.from("archived_orders").upsert(archived, { onConflict: "order_id" });
      if (archiveError) {
        logFailure("delete-account-archive", archiveError);
        return { error: "Impossible d’archiver l’historique des ventes. Votre compte n’a pas été supprimé : rien ne doit disparaître sans trace comptable." };
      }
    }
  }

  const media = await collectStoreMedia(service, storeIds);

  const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
  if (deleteError) {
    logFailure("delete-account", deleteError);
    return { error: "La suppression a échoué. Votre compte est intact : réessayez, et écrivez à l’équipe MYSTOREY si cela se reproduit." };
  }

  // Les fichiers en dernier : tant que la suppression pouvait échouer, les images
  // devaient rester en place.
  await removeStoreMedia(service, media);
  // Portée locale : le jeton ne vaut plus rien côté serveur, et un appel réseau qui
  // échouerait laisserait le cookie en place sur un compte qui n'existe plus.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
