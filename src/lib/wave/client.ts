const WAVE_API_BASE = "https://api.wavemoney.io/v1";

export type WavePaymentIntent = {
  id: string;
  checkout_url: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
};

export type WaveWebhookPayload = {
  type: "payment.completed" | "payment.failed";
  payment_id: string;
  amount: number;
  status: string;
  metadata?: Record<string, unknown>;
};

export class WaveClient {
  private apiKey: string;
  private merchantId: string;

  constructor() {
    this.apiKey = process.env.WAVE_API_KEY || "";
    this.merchantId = process.env.WAVE_MERCHANT_ID || "";

    if (!this.apiKey || !this.merchantId) {
      throw new Error("Wave API key or merchant ID not configured");
    }
  }

  async createPaymentIntent(params: {
    storeId: string;
    planId: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<WavePaymentIntent> {
    const payload = {
      merchant_id: this.merchantId,
      amount: params.amount,
      currency: "XOF",
      description: params.description,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        store_id: params.storeId,
        plan_id: params.planId,
      },
    };

    const response = await fetch(`${WAVE_API_BASE}/payments/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Wave API error: ${error.message || "Unknown error"}`);
    }

    const data = (await response.json()) as { payment_id: string; checkout_url: string; amount: number };
    return {
      id: data.payment_id,
      checkout_url: data.checkout_url,
      amount: data.amount,
      currency: "XOF",
      status: "pending",
    };
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const webhookSecret = process.env.WAVE_WEBHOOK_SECRET || "";
    if (!webhookSecret) return false;

    const hmac = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      new TextEncoder().encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(hmac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature.length !== expectedSignature.length) return false;
    let difference = 0;
    for (let index = 0; index < signature.length; index += 1) difference |= signature.charCodeAt(index) ^ expectedSignature.charCodeAt(index);
    return difference === 0;
  }
}

export function getWaveClient() {
  return new WaveClient();
}
