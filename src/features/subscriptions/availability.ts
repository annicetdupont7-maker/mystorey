/**
 * Les plans payants ne s'achètent qu'une fois de vraies clés en place.
 * Tant que ce n'est pas le cas, le passage en caisse reste fermé — une vendeuse qui
 * paie dans un compte de test n'obtient aucun abonnement, et il nous reste un
 * remboursement à faire à la main.
 *
 * Passer en production est un changement de configuration, pas de code.
 *
 * Volontairement côté serveur (pas de préfixe NEXT_PUBLIC) : le navigateur n'est
 * jamais l'autorité sur le fait qu'un plan payant soit achetable.
 */

/** SasPay est le prestataire d'encaissement courant. */
export function saspayPaidPlansArePurchasable(): boolean {
  if (process.env.SASPAY_PAYMENTS_ENABLED !== "true") return false;
  return Boolean(process.env.SASPAY_SECRET_KEY && process.env.SASPAY_WEBHOOK_SECRET);
}

/**
 * Kkiapay n'est plus branché sur le tableau de bord. Son interrupteur reste séparé
 * pour que réactiver l'un n'ouvre jamais l'autre par accident.
 */
export function kkiapayPaidPlansArePurchasable(): boolean {
  if (process.env.KKIAPAY_PAYMENTS_ENABLED !== "true") return false;
  return Boolean(process.env.KKIAPAY_PUBLIC_KEY && process.env.KKIAPAY_PRIVATE_KEY && process.env.KKIAPAY_WEBHOOK_SECRET);
}

/** Ce que regarde l'interface : y a-t-il un moyen de payer, oui ou non. */
export function paidPlansArePurchasable(): boolean {
  return saspayPaidPlansArePurchasable();
}

/**
 * En ADD_ON — ce que les trois réseaux béninois imposent dans leur grille — la
 * vendeuse paie le prix du plan PLUS les frais du réseau. Un plan affiché à
 * 2 000 FCFA lui est alors débité environ 2 062 FCFA.
 *
 * L'interface doit le dire : annoncer un prix puis en prélever un autre est
 * exactement le genre de surprise qui fait perdre la confiance d'une vendeuse.
 */
export function sellerPaysProviderFees(): boolean {
  return (process.env.SASPAY_FEE_CHARGE_MODE?.trim() || "ADD_ON") === "ADD_ON";
}
