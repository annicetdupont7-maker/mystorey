export function paymentAmountMatches(expectedAmount: number, receivedAmount: number) {
  return Number.isInteger(expectedAmount) && expectedAmount >= 0 && receivedAmount === expectedAmount;
}

export function subscriptionIsActive(subscription: { status?: string | null; payment_status?: string | null; expires_at?: string | null } | null | undefined, now = Date.now()) {
  if (!subscription) return true;
  if (subscription.status !== "active" || subscription.payment_status !== "paid") return false;
  return !subscription.expires_at || new Date(subscription.expires_at).getTime() > now;
}
