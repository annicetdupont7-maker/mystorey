export type SubscriptionPlanId = "free" | "growth" | "pro";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  productLimit: number | null;
  badge?: string;
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Découverte",
    price: 0,
    priceLabel: "0 FCFA / mois",
    description: "Parfait pour lancer votre boutique et tester le marché.",
    productLimit: 10,
    badge: "Starter",
  },
  {
    id: "growth",
    name: "Plus",
    price: 2000,
    priceLabel: "2 000 FCFA / mois",
    description: "Pour vendre plus sereinement et développer votre catalogue.",
    productLimit: 20,
    badge: "Populaire",
  },
  {
    id: "pro",
    name: "Pro",
    price: 2500,
    priceLabel: "2 500 FCFA / mois",
    description: "Pour les boutiques qui veulent gérer davantage de produits.",
    productLimit: 100,
    badge: "Premium",
  },
];

export function getPlanById(planId?: string | null): SubscriptionPlan {
  return subscriptionPlans.find((plan) => plan.id === planId) ?? subscriptionPlans[0];
}

export function canAddProduct(productCount: number, planId?: string | null): boolean {
  const plan = getPlanById(planId);
  if (plan.productLimit === null) return true;
  return productCount < plan.productLimit;
}
