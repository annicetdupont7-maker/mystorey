import { createHmac, timingSafeEqual } from "node:crypto";

const SASPAY_API_BASE = "https://api.saspay.me/api/v1";

/** Une signature plus vieille que ça est refusée : un webhook capté ne se rejoue pas. */
const WEBHOOK_TOLERANCE_SECONDS = 300;

export type SaspayCheckoutSession = {
  /** Identifiant de la SESSION. Ce n'est pas celui de la transaction. */
  id: string;
  checkout_url: string;
  status: string;
};

export type SaspayCheckoutStatus = {
  id: string;
  status: string;
  /** Renseigné dès que la cliente a lancé le paiement : c'est la clé qui relie la session au webhook. */
  transaction_id: string | null;
  transaction_status: string | null;
  transaction_reference: string | null;
};

export type SaspayTransaction = {
  id: string;
  reference: string | null;
  status: string;
  requested_amount: string | null;
  net_amount: string | null;
  currency: string | null;
  transaction_type: string | null;
  flow_direction: string | null;
};

/**
 * SasPay n'encaisse que dans un sens chez nous : une vendeuse paie son abonnement.
 * Le client n'expose donc volontairement aucun décaissement — même si la clé API en
 * a le droit, le code ne sait pas envoyer d'argent.
 */
export class SaspayClient {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.SASPAY_SECRET_KEY || "";
    if (!this.secretKey) throw new Error("SASPAY_SECRET_KEY manquante.");
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json", ...extra };
  }

  /**
   * SasPay enveloppe toutes ses réponses dans `{ success, data, code }` — la
   * documentation, elle, montre les objets nus. Vérifié contre l'API réelle le
   * 2026-10-16 : sans ce dépliage, chaque champ lu est `undefined`.
   * Le `?? payload` garde le code debout si l'enveloppe disparaissait un jour.
   */
  private async read(response: Response, context: string): Promise<Record<string, unknown>> {
    const raw = await response.text().catch(() => "");

    if (!response.ok) {
      throw new Error(`SasPay ${context} a répondu ${response.status}: ${raw.slice(0, 400)}`);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(`SasPay ${context} a renvoyé une réponse illisible.`);
    }

    const envelope = payload as { data?: unknown };
    return ((envelope?.data ?? payload) ?? {}) as Record<string, unknown>;
  }

  /**
   * Page de paiement hébergée : la vendeuse choisit son réseau (MTN, Moov, Wave, carte)
   * chez SasPay. On évite ainsi de lui demander son opérateur et de gérer les OTP.
   */
  async createCheckoutSession(params: {
    storeId: string;
    planId: string;
    amount: number;
    description: string;
    customerEmail: string;
    customerName: string;
    returnUrl: string;
  }): Promise<SaspayCheckoutSession> {
    const response = await fetch(`${SASPAY_API_BASE}/checkout-sessions/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        // L'API attend un décimal en chaîne, pas un entier.
        amount: params.amount.toFixed(2),
        currency: "XOF",
        country: process.env.SASPAY_COUNTRY?.trim() || "BJ",
        description: params.description,
        customer_email: params.customerEmail,
        customer_name: params.customerName,
        return_url: params.returnUrl,
        // ADD_ON parce que c'est ce que les trois réseaux béninois imposent dans leur
        // grille (MTN 3 % + 2, Moov et Celtiis 3,25 %) : la vendeuse paie le prix du
        // plan plus les frais, et MYSTOREY encaisse le prix entier. Mettre DEDUCTED
        // fait payer le prix affiché et sort les frais de notre part.
        fee_charge_mode: process.env.SASPAY_FEE_CHARGE_MODE?.trim() || "ADD_ON",
        metadata: { store_id: params.storeId, plan_id: params.planId },
      }),
    });

    const data = await this.read(response, "checkout-sessions");
    const id = typeof data.id === "string" ? data.id : "";
    const checkoutUrl = typeof data.checkout_url === "string" ? data.checkout_url : "";

    // Ne jamais inventer d'identifiant : une session qu'aucun webhook ne peut
    // rapprocher resterait "en attente" alors que la vendeuse a payé.
    if (!id || !checkoutUrl) throw new Error("SasPay n'a pas renvoyé de session de paiement exploitable.");

    return { id, checkout_url: checkoutUrl, status: typeof data.status === "string" ? data.status : "PENDING" };
  }

  async getCheckoutSessionStatus(sessionId: string): Promise<SaspayCheckoutStatus> {
    const response = await fetch(`${SASPAY_API_BASE}/checkout-sessions/${encodeURIComponent(sessionId)}/status/`, {
      headers: this.headers(),
      cache: "no-store",
    });

    const data = await this.read(response, "checkout-session status");
    return {
      id: String(data.id ?? sessionId),
      status: String(data.status ?? ""),
      transaction_id: data.transaction_id ? String(data.transaction_id) : null,
      transaction_status: data.transaction_status ? String(data.transaction_status) : null,
      transaction_reference: data.transaction_reference ? String(data.transaction_reference) : null,
    };
  }

  /**
   * L'autorité sur un paiement, c'est l'API — pas le corps du webhook. Un webhook
   * correctement signé dit seulement « quelque chose a bougé » ; on revérifie
   * toujours le montant et le statut à la source avant d'activer un abonnement.
   */
  async verifyPayment(paymentId: string): Promise<SaspayTransaction> {
    const response = await fetch(`${SASPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}/verify/`, {
      headers: this.headers(),
      cache: "no-store",
    });

    const data = await this.read(response, "payments verify");
    return {
      id: String(data.id ?? paymentId),
      reference: data.reference ? String(data.reference) : null,
      status: String(data.status ?? ""),
      requested_amount: data.requested_amount ? String(data.requested_amount) : null,
      net_amount: data.net_amount ? String(data.net_amount) : null,
      currency: data.currency ? String(data.currency) : null,
      transaction_type: data.transaction_type ? String(data.transaction_type) : null,
      flow_direction: data.flow_direction ? String(data.flow_direction) : null,
    };
  }

  /**
   * SasPay signe `timestamp.corps` en HMAC-SHA256. L'horodatage compte autant que la
   * signature : sans lui, un webhook valide intercepté une fois pourrait être rejoué
   * indéfiniment pour réactiver un abonnement impayé.
   */
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string, now = Date.now()): boolean {
    const webhookSecret = process.env.SASPAY_WEBHOOK_SECRET || "";
    if (!webhookSecret || !signature || !timestamp) return false;

    const sentAt = Number(timestamp);
    if (!Number.isFinite(sentAt)) return false;
    if (Math.abs(Math.floor(now / 1000) - sentAt) > WEBHOOK_TOLERANCE_SECONDS) return false;

    const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const received = Buffer.from(signature.trim().toLowerCase(), "utf8");
    const computed = Buffer.from(expected, "utf8");
    if (received.length !== computed.length) return false;

    return timingSafeEqual(received, computed);
  }
}

export function getSaspayClient() {
  return new SaspayClient();
}
