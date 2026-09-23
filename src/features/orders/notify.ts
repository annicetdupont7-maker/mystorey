import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/app-url";
import { buildNewOrderEmail } from "./order-email";
import type { OrderMessageView } from "./messages";

/**
 * L'email de nouvelle commande part dès que les deux réglages sont en place.
 * Absents, MYSTOREY se comporte exactement comme avant : aucune erreur, aucun
 * email. C'est un changement de configuration, pas de code — comme les paiements.
 *
 * RESEND_API_KEY     : clé API Resend (resend.com, gratuit jusqu'à 3 000 envois/mois)
 * ORDER_EMAILS_FROM  : expéditeur vérifié, ex. "MYSTOREY <commandes@mystorey.app>"
 */
export function orderEmailsAreEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.ORDER_EMAILS_FROM?.trim());
}

/**
 * Prévient la vendeuse qu'une commande est arrivée. À appeler dans `after()` :
 * la cliente ne doit jamais attendre un envoi d'email pour voir sa confirmation.
 *
 * N'échoue jamais bruyamment. Une commande enregistrée dont l'email n'est pas
 * parti reste une commande enregistrée : elle est visible dans le tableau de
 * bord. L'inverse — casser le checkout parce qu'un fournisseur d'email est en
 * panne — ferait perdre la vente.
 */
export async function notifySellerOfNewOrder(storeId: string, storeName: string, order: OrderMessageView): Promise<void> {
  if (!orderEmailsAreEnabled()) return;
  try {
    const supabase = createSupabaseServiceClient();
    const { data: store } = await supabase.from("stores").select("owner_id").eq("id", storeId).maybeSingle();
    if (!store?.owner_id) return;

    // L'adresse de la vendeuse vit dans auth.users, pas dans profiles : seule la
    // clé service peut la lire, et jamais depuis le navigateur.
    const { data: account } = await supabase.auth.admin.getUserById(store.owner_id);
    const to = account?.user?.email;
    if (!to) return;

    const mail = buildNewOrderEmail(order, storeName, `${appUrl()}/dashboard/orders`);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.ORDER_EMAILS_FROM, to, subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!response.ok) {
      console.error("[order-email] envoi refusé", { status: response.status, body: await response.text().catch(() => "") });
    }
  } catch (error) {
    console.error("[order-email] envoi impossible", error);
  }
}
