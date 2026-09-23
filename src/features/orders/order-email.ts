import { formatPrice } from "@/features/storefront/storefront-types";
import type { OrderMessageView } from "./messages";

/**
 * L'email qui prévient la vendeuse qu'une commande vient d'arriver.
 *
 * Pourquoi il existe : le checkout enregistre la commande, puis ouvre WhatsApp
 * CHEZ LA CLIENTE. Si elle n'envoie pas le message — elle ferme l'onglet, elle
 * n'a plus de connexion, elle est sur un ordinateur sans WhatsApp — la commande
 * dort dans le tableau de bord et personne n'est prévenu. Cet email est le seul
 * canal qui ne dépend pas d'un geste de la cliente.
 *
 * Fonction pure : elle ne connaît ni le réseau ni la configuration, seulement
 * ce qu'il faut écrire.
 */
export type OrderEmail = { subject: string; text: string; html: string };

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildNewOrderEmail(order: OrderMessageView, storeName: string, dashboardUrl: string): OrderEmail {
  const tag = order.order_number ? `#${order.order_number}` : "";
  const subject = `Nouvelle commande ${tag} · ${formatPrice(order.total)}`.replace(/\s+/g, " ").trim();

  const lines = order.items.map((item) => `• ${item.quantity} × ${item.name} — ${formatPrice(item.unitPrice * item.quantity)}`);
  const details = [
    `Client : ${order.customer_name.trim() || "—"}`,
    order.customer_phone.trim() ? `Téléphone : ${order.customer_phone.trim()}` : "",
    order.customer_address.trim() ? `Livraison : ${order.customer_address.trim()}` : "",
    order.note.trim() ? `Note : ${order.note.trim()}` : "",
  ].filter(Boolean);

  const text = [
    `Bonne nouvelle : une commande vient d'arriver sur ${storeName}.`,
    "",
    `Commande ${tag || "(sans numéro)"}`,
    ...lines,
    `Total : ${formatPrice(order.total)}`,
    "",
    ...details,
    "",
    `Voir et confirmer la commande : ${dashboardUrl}`,
    "",
    "MYSTOREY",
  ].join("\n");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#faf7f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2b1d22">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a6f78">MYSTOREY</p>
<h1 style="margin:0 0 16px;font-size:20px">Une commande vient d’arriver sur ${escape(storeName)}</h1>
<p style="margin:0 0 8px;font-weight:700">Commande ${escape(tag || "(sans numéro)")}</p>
<ul style="margin:0 0 12px;padding-left:18px">${order.items.map((item) => `<li>${item.quantity} × ${escape(item.name)} — ${escape(formatPrice(item.unitPrice * item.quantity))}</li>`).join("")}</ul>
<p style="margin:0 0 16px;font-size:18px;font-weight:800">Total : ${escape(formatPrice(order.total))}</p>
<div style="margin:0 0 20px;padding:12px 14px;background:#faf7f5;border-radius:12px;font-size:14px;line-height:1.7">${details.map((line) => escape(line)).join("<br>")}</div>
<a href="${escape(dashboardUrl)}" style="display:inline-block;background:#4f1d2d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Voir la commande</a>
</div></body></html>`;

  return { subject, text, html };
}
