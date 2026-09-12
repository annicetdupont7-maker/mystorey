import { countOrdersByProduct } from "@/features/orders/overview";
import type { Insight, InsightContext, InsightTone } from "../types";

const TONE_ORDER: Record<InsightTone, number> = { highlight: 0, warning: 1, opportunity: 2, positive: 3, quiet: 4 };

export function productOrderStats(ctx: InsightContext) {
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const stat of countOrdersByProduct(ctx.orders)) {
    map.set(stat.productId, { orders: stat.orders, revenue: stat.revenue });
  }
  return map;
}

export function buildInsights(ctx: InsightContext): Insight[] {
  const insights: Insight[] = [];
  const { overview, products } = ctx;

  if (products.length === 0) {
    insights.push({ id: "no-products", tone: "highlight", title: "Bienvenue dans votre espace", body: "Ajoutez votre premier produit pour commencer à vendre.", href: "/dashboard/products/new", cta: "Ajouter un produit" });
  } else {
    if (!ctx.storePublished) {
      insights.push({ id: "not-published", tone: "warning", title: "Votre boutique n’est pas encore publiée", body: "Personne ne peut encore voir votre catalogue. Publiez-la pour ouvrir votre vitrine.", href: "/dashboard/storefront/appearance", cta: "Publier" });
    }
  }
  if (!ctx.whatsappSet) {
    insights.push({ id: "no-whatsapp", tone: "warning", title: "Aucun numéro WhatsApp", body: "Sans numéro WhatsApp, vos clientes ne peuvent pas commander.", href: "/dashboard/settings", cta: "Ajouter le numéro" });
  }

  if (overview.totalOrders === 0) {
    insights.push({ id: "no-data", tone: "quiet", title: "Pas encore assez de données", body: "Vos statistiques apparaîtront ici dès votre première commande enregistrée." });
  } else {
    if (overview.pendingCount > 0) {
      insights.push({
        id: "pending-orders", tone: "highlight", title: `${overview.pendingCount} commande${overview.pendingCount > 1 ? "s" : ""} à traiter`,
        body: "Elles attendent votre confirmation pour être préparées.", href: "/dashboard/orders", cta: "Voir les commandes",
      });
    }
    const stats = productOrderStats(ctx);
    const sold = products.map((p) => ({ product: p, ...(stats.get(p.id) ?? { orders: 0, revenue: 0 }) })).filter((entry) => entry.orders > 0).sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
    const best = sold.length > 0 ? sold[0] : null;
    if (best) {
      insights.push({ id: "popular-product", tone: "positive", title: `“${best.product.name}” est votre produit le plus commandé`, body: `${best.orders} commande${best.orders > 1 ? "s" : ""} · ${best.revenue.toLocaleString("fr-FR")} FCFA générés.`, href: "/dashboard/products", cta: "Voir le catalogue" });
    }
    const diff = overview.lastWeekCount - overview.previousWeekCount;
    if (diff > 0) {
      insights.push({ id: "week-growth", tone: "positive", title: "Vos commandes progressent cette semaine", body: `+${diff} commande${diff > 1 ? "s" : ""} par rapport à la semaine précédente.` });
    } else if (diff < 0) {
      insights.push({ id: "week-drop", tone: "warning", title: "Cette semaine est plus calme", body: `${-diff} commande${-diff > 1 ? "s" : ""} de moins que la semaine précédente. Un partage de votre lien peut relancer l’activité.` });
    }
    if (overview.weekendShare !== null && overview.weekendShare >= 0.6) {
      insights.push({ id: "weekend-opportunity", tone: "opportunity", title: "🎯 Le week-end porte les ventes", body: "Vos commandes se concentrent le samedi et le dimanche. Mettez vos nouveautés en avant dès le vendredi." });
    }
    const ignored = products.filter((p) => p.is_available && (stats.get(p.id)?.orders ?? 0) === 0);
    if (ignored.length > 0) {
      const first = ignored[0];
      insights.push({ id: "product-quiet", tone: "quiet", title: `“${first.name}” n’a encore aucune commande`, body: "Il est en vente mais n’a pas encore été commandé. Un partage sur WhatsApp peut le faire décoller.", href: "/dashboard/products", cta: "Le partager" });
    }
  }

  return insights.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}