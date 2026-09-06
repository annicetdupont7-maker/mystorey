import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getKkiapayClient } from "./kkiapay/client";
import { getWaveClient } from "./wave/client";

process.env.KKIAPAY_PRIVATE_KEY = "test-secret";
process.env.KKIAPAY_PUBLIC_KEY = "test-public";
process.env.KKIAPAY_WEBHOOK_SECRET = "kkiapay-webhook";
process.env.WAVE_API_KEY = "test-api";
process.env.WAVE_MERCHANT_ID = "test-merchant";
process.env.WAVE_WEBHOOK_SECRET = "wave-webhook";

describe("payment webhook signatures", () => {
  it("accepts only the exact Kkiapay HMAC", async () => {
    const body = '{"event":"payment.success"}';
    const signature = createHmac("sha256", "kkiapay-webhook").update(body).digest("hex");
    const client = getKkiapayClient();
    await expect(client.verifyWebhookSignature(body, signature)).resolves.toBe(true);
    await expect(client.verifyWebhookSignature(body, `${signature}00`)).resolves.toBe(false);
  });

  it("accepts only the exact Wave HMAC", async () => {
    const body = '{"type":"payment.completed"}';
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("wave-webhook"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const signature = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
    const client = getWaveClient();
    await expect(client.verifyWebhookSignature(body, signature)).resolves.toBe(true);
    await expect(client.verifyWebhookSignature(body, `${signature}00`)).resolves.toBe(false);
  });
});
