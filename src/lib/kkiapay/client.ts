import { createHmac } from "node:crypto";

const KKIAPAY_API_BASE = "https://api.kkiapay.me/api/v1";

export type KkiapayPaymentIntent = {
  id: string;
  checkout_url: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
};

export type KkiapayWebhookPayload = {
  event: "payment.success" | "payment.failed" | "payment.cancelled";
  payment_id?: string;
  amount?: number;
  status?: string;
  data?: Record<string, unknown>;
};

export class KkiapayClient {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    this.privateKey = process.env.KKIAPAY_PRIVATE_KEY || "";
    this.publicKey = process.env.KKIAPAY_PUBLIC_KEY || "";

    if (!this.privateKey || !this.publicKey) {
      throw new Error("Kkiapay API keys not configured");
    }
  }

  async createPaymentIntent(params: {
    storeId: string;
    planId: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<KkiapayPaymentIntent> {
    const payload = {
      amount: params.amount,
      currency: "XOF",
      description: params.description,
      metadata: {
        store_id: params.storeId,
        plan_id: params.planId,
      },
      callback_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      api_key: this.publicKey,
    };

    const response = await fetch(`${KKIAPAY_API_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Kkiapay API error: ${error.message || JSON.stringify(error)}`);
    }

    const data = (await response.json()) as {
      payment_id?: string;
      payment_url?: string;
      amount?: number;
      id?: string;
      checkout_url?: string;
    };

    const paymentId = data.payment_id ?? data.id ?? crypto.randomUUID();
    const checkoutUrl = data.payment_url ?? data.checkout_url ?? "";

    return {
      id: paymentId,
      checkout_url: checkoutUrl,
      amount: Number(data.amount ?? params.amount),
      currency: "XOF",
      status: "pending",
    };
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const webhookSecret = process.env.KKIAPAY_WEBHOOK_SECRET || "";
    if (!webhookSecret) return false;

    const hmac = createHmac("sha256", webhookSecret).update(payload).digest("hex");
    if (signature.length !== hmac.length) return false;

    let difference = 0;
    for (let index = 0; index < signature.length; index += 1) {
      difference |= signature.charCodeAt(index) ^ hmac.charCodeAt(index);
    }

    return difference === 0;
  }
}

export function getKkiapayClient() {
  return new KkiapayClient();
}
