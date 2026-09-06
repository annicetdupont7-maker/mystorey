const FEDAPAY_API_BASE = "https://api.fedapay.com/v1";

export type FedapayPaymentIntent = {
  id: string;
  checkout_url: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "declined";
};

export type FedapayWebhookPayload = {
  type: "transaction.approved" | "transaction.declined";
  transaction: {
    id: string;
    amount: number;
    status: string;
    reference?: string;
    metadata?: Record<string, unknown>;
  };
};

export class FedapayClient {
  private secretKey: string;
  private publicKey: string;
  private merchantId: string;

  constructor() {
    this.secretKey = process.env.FEDAPAY_SECRET_KEY || "";
    this.publicKey = process.env.FEDAPAY_PUBLIC_KEY || "";
    this.merchantId = process.env.FEDAPAY_MERCHANT_ID || "";

    if (!this.secretKey || !this.publicKey) {
      throw new Error("Fedapay API keys not configured");
    }
  }

  async createPaymentIntent(params: {
    storeId: string;
    planId: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<FedapayPaymentIntent> {
    const payload = {
      amount: params.amount,
      currency: "XOF",
      description: params.description,
      customer: {
        firstname: "Customer",
        lastname: "VendoFlow",
      },
      metadata: {
        store_id: params.storeId,
        plan_id: params.planId,
      },
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    };

    const response = await fetch(`${FEDAPAY_API_BASE}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Fedapay API error: ${error.message || JSON.stringify(error)}`);
    }

    const data = (await response.json()) as { data: { id: string; token: string; amount: number } };
    const checkoutUrl = `https://checkout.fedapay.com?token=${data.data.token}`;

    return {
      id: data.data.id,
      checkout_url: checkoutUrl,
      amount: data.data.amount,
      currency: "XOF",
      status: "pending",
    };
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET || "";
    if (!webhookSecret) return false;

    // Fedapay uses SHA256 HMAC for webhook verification
    const crypto = await import("crypto");
    const hmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    if (signature.length !== hmac.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
  }

  async getTransaction(transactionId: string) {
    const response = await fetch(`${FEDAPAY_API_BASE}/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch transaction from Fedapay");
    }

    return (await response.json()) as { data: { id: string; status: string; amount: number; metadata?: Record<string, unknown> } };
  }
}

export function getFedapayClient() {
  return new FedapayClient();
}
