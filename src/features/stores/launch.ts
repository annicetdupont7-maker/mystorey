/**
 * The launch path of a shop, from "account created" to "link shared". One pure
 * function owns the rules so the dashboard checklist, the publish button and the
 * server action can never disagree about what is missing.
 */
export type LaunchInput = {
  storeStatus: string;
  whatsapp: string | null | undefined;
  themeChosen: boolean;
  productCount: number;
  publishedProductCount: number;
};

export type LaunchStepId = "store" | "theme" | "whatsapp" | "product" | "product_published" | "store_published" | "link";

export type LaunchStep = {
  id: LaunchStepId;
  label: string;
  /** The same step phrased as the thing to do next. */
  todo: string;
  done: boolean;
  /** What to do, in plain words, when the step is not done yet. */
  hint: string;
  cta?: { label: string; href: string };
};

export const hasWhatsapp = (value: string | null | undefined) => Boolean(value && value.replace(/\D/g, "").length >= 8);

export function buildLaunchSteps(input: LaunchInput): LaunchStep[] {
  const published = input.storeStatus === "published";
  const whatsapp = hasWhatsapp(input.whatsapp);
  const hasProduct = input.productCount > 0;
  const hasPublishedProduct = input.publishedProductCount > 0;
  return [
    { id: "store", todo: "Créez votre boutique", label: "Boutique créée", done: true, hint: "" },
    {
      id: "theme",
      todo: "Choisissez votre thème",
      label: "Thème choisi",
      done: input.themeChosen,
      hint: "Choisissez les couleurs et l’ambiance de votre boutique.",
      cta: { label: input.themeChosen ? "Changer de thème" : "Choisir mon thème", href: "/dashboard/storefront/appearance" },
    },
    {
      id: "whatsapp",
      todo: "Ajoutez votre numéro WhatsApp",
      label: "Numéro WhatsApp ajouté",
      done: whatsapp,
      hint: "Indispensable : c’est sur ce numéro que vos clientes vous envoient leurs commandes.",
      cta: { label: "Ajouter mon numéro", href: "/dashboard/storefront/identity#whatsapp" },
    },
    {
      id: "product",
      todo: "Ajoutez votre premier produit",
      label: "Premier produit ajouté",
      done: hasProduct,
      hint: "Une photo, un nom et un prix suffisent pour commencer.",
      cta: { label: "Ajouter un produit", href: "/dashboard/products/new" },
    },
    {
      id: "product_published",
      todo: "Rendez un produit visible",
      label: "Produit publié",
      done: hasPublishedProduct,
      hint: hasProduct ? "Vos produits sont tous masqués : rendez-en au moins un visible." : "Vos produits sont visibles dès que vous les ajoutez.",
      cta: { label: "Voir mes produits", href: "/dashboard/products" },
    },
    {
      id: "store_published",
      todo: "Publiez votre boutique",
      label: "Boutique publiée",
      done: published,
      hint: "Tant qu’elle n’est pas publiée, vos clientes voient une page d’attente.",
    },
    {
      id: "link",
      todo: "Partagez votre lien",
      label: "Lien prêt à être partagé",
      done: published && whatsapp && hasPublishedProduct,
      hint: published && !whatsapp
        ? "Votre boutique est en ligne mais ne peut pas recevoir de commandes sans numéro WhatsApp."
        : "Votre lien sera prêt dès que la boutique sera publiée.",
    },
  ];
}

export function isLaunchReady(steps: LaunchStep[]): boolean {
  return steps.every((step) => step.done);
}

/** The first unfinished step: what the seller should do next. */
export function nextLaunchStep(steps: LaunchStep[]): LaunchStep | null {
  return steps.find((step) => !step.done) ?? null;
}

/**
 * Why a shop cannot be published yet. Publishing a shop with nothing to buy, or with
 * no number to receive orders, sends clients to a page where they cannot order — the
 * database refuses those orders — so both are required rather than recommended.
 */
export function publishBlockers(input: Pick<LaunchInput, "whatsapp" | "publishedProductCount" | "productCount">): string[] {
  const blockers: string[] = [];
  if (input.publishedProductCount === 0) {
    blockers.push(input.productCount === 0
      ? "Ajoutez au moins un produit : une boutique vide ne donne pas envie d’acheter."
      : "Rendez au moins un produit visible (vos produits sont tous masqués).");
  }
  if (!hasWhatsapp(input.whatsapp)) {
    blockers.push("Ajoutez votre numéro WhatsApp : sans lui, vos clientes ne peuvent pas vous envoyer leur commande.");
  }
  return blockers;
}
