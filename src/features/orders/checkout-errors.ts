/**
 * Les erreurs nommées levées par la fonction SQL `create_checkout_order`,
 * traduites en une phrase que la cliente peut suivre.
 *
 * Séparé de l'action pour être testable sans base : c'est le seul endroit qui
 * décide de ce que voit la cliente quand sa commande est refusée.
 */
export function checkoutErrorMessage(code: string): string {
  if (code.includes("checkout_rate_limited")) {
    return "Trop de commandes viennent d’être envoyées depuis cet appareil. Patientez quelques minutes avant de réessayer.";
  }
  if (code.includes("checkout_insufficient_stock")) {
    return "La quantité demandée n’est plus disponible. Ajustez votre panier.";
  }
  if (code.includes("checkout_variant_not_found")) {
    return "Le choix sélectionné n’est plus disponible. Choisissez-en un autre.";
  }
  if (code.includes("checkout_product_not_found")) {
    return "Un article de votre panier n’est plus disponible. Retirez-le puis réessayez.";
  }
  if (code.includes("checkout_store_unavailable") || code.includes("checkout_store_not_found")) {
    return "Cette boutique ne reçoit pas de commandes pour le moment.";
  }
  return "Impossible d’enregistrer votre commande. Réessayez.";
}

/**
 * Le champ `website` du formulaire est invisible, hors du focus clavier et
 * `aria-hidden` : une cliente ne peut pas le remplir, un script qui remplit
 * tous les champs le remplit. Rempli = on refuse sans toucher à la base.
 */
export function looksAutomated(honeypot: FormDataEntryValue | null): boolean {
  return typeof honeypot === "string" && honeypot.trim().length > 0;
}
