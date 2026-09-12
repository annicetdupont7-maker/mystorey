/**
 * Paid plans are only purchasable once real Kkiapay credentials are in place.
 * Until then the checkout must stay closed — a seller who pays into a sandbox
 * account gets no subscription and we get a refund to handle by hand.
 *
 * Flipping to live is a configuration change, not a code change: set the live
 * Kkiapay keys and KKIAPAY_PAYMENTS_ENABLED=true.
 *
 * Server-only on purpose (no NEXT_PUBLIC prefix): the client is never the
 * authority on whether a paid plan can be bought.
 */
export function paidPlansArePurchasable(): boolean {
  if (process.env.KKIAPAY_PAYMENTS_ENABLED !== "true") return false;
  return Boolean(process.env.KKIAPAY_PUBLIC_KEY && process.env.KKIAPAY_PRIVATE_KEY && process.env.KKIAPAY_WEBHOOK_SECRET);
}
