import type { FeaturedSuggestion, InsightContext, Todo } from "../types";
import { productOrderStats } from "./insights";

// Copy here is vouvoiement, like the rest of the product. It used to drift into tutoiement
// — sometimes inside a single item ("Complète… / Détaillez…") — which read as two voices.
export function buildTodos(ctx: InsightContext): Todo[] {
  const todos: Todo[] = [];
  const { overview, products } = ctx;

  if (overview.pendingCount > 0) {
    todos.push({ id: "confirm-orders", label: `${overview.pendingCount} commande${overview.pendingCount > 1 ? "s" : ""} attend${overview.pendingCount > 1 ? "ent" : ""} une confirmation`, detail: "Confirmez les commandes pour lancer les préparations.", href: "/dashboard/orders", cta: "Voir les commandes", urgent: true });
  }
  if (products.length > 0 && !ctx.storePublished) {
    todos.push({ id: "publish-store", label: "Publiez votre boutique", detail: "Ouvrez votre vitrine pour recevoir des visiteurs.", href: "/dashboard/storefront/appearance", cta: "Publier", urgent: true });
  }
  if (!ctx.whatsappSet) {
    todos.push({ id: "set-whatsapp", label: "Ajoutez votre numéro WhatsApp", detail: "C’est par WhatsApp que vos clientes commandent.", href: "/dashboard/settings", cta: "Configurer", urgent: true });
  }
  if (products.length === 0) {
    todos.push({ id: "first-product", label: "Ajoutez votre premier produit", detail: "Votre boutique commence ici : une photo et un prix suffisent.", href: "/dashboard/products/new", cta: "Ajouter", urgent: true });
  } else {
    const noImage = products.filter((p) => !p.image_url).length;
    if (noImage > 0) todos.push({ id: "add-photos", label: `Ajoutez une photo à ${noImage} produit${noImage > 1 ? "s" : ""}`, detail: "Les visuels font vendre : illustrez chaque article.", href: "/dashboard/products", cta: "Compléter" });
    const noDescription = products.filter((p) => !p.description.trim()).length;
    if (noDescription > 0) todos.push({ id: "add-descriptions", label: `Complétez la description de ${noDescription} produit${noDescription > 1 ? "s" : ""}`, detail: "Précisez la matière, la taille, les conseils d’usage.", href: "/dashboard/products", cta: "Compléter" });
    const noneAvailable = products.every((p) => !p.is_available);
    if (noneAvailable) todos.push({ id: "enable-products", label: "Activez au moins un produit à la vente", detail: "Tout votre catalogue est masqué : personne ne peut acheter.", href: "/dashboard/products", cta: "Activer", urgent: true });
    const noneFeatured = products.every((p) => !p.is_featured);
    if (noneFeatured) todos.push({ id: "pick-featured", label: "Choisissez un produit vedette", detail: "Le produit à la une sera mis en avant sur votre vitrine.", href: "/dashboard/products", cta: "Choisir" });
  }
  return todos;
}

export function suggestFeatured(ctx: InsightContext): FeaturedSuggestion {
  const available = ctx.products.filter((p) => p.is_available);
  if (available.length === 0) return null;
  const stats = productOrderStats(ctx);
  const ranked = available
    .map((product) => ({ product, orders: stats.get(product.id)?.orders ?? 0, revenue: stats.get(product.id)?.revenue ?? 0 }))
    .sort((a, b) => b.orders - a.orders || (a.product.is_featured ? 1 : 0) - (b.product.is_featured ? 1 : 0) || b.revenue - a.revenue);
  const winner = ranked[0];
  const reason = winner.orders > 0
    ? `Le plus commandé de la boutique (${winner.orders} commande${winner.orders > 1 ? "s" : ""}).`
    : winner.product.is_featured
      ? "Votre produit vedette, prêt à être partagé."
      : "Disponible à la vente. Mettez-le en avant pour gagner en visibilité.";
  return { product: winner.product, reason };
}
