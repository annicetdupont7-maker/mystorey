import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getKkiapayClient } from "./kkiapay/client";
import { getWaveClient } from "./wave/client";
import { getSaspayClient } from "./saspay/client";

process.env.KKIAPAY_PRIVATE_KEY = "test-secret";
process.env.KKIAPAY_PUBLIC_KEY = "test-public";
process.env.KKIAPAY_WEBHOOK_SECRET = "kkiapay-webhook";
process.env.WAVE_API_KEY = "test-api";
process.env.WAVE_MERCHANT_ID = "test-merchant";
process.env.WAVE_WEBHOOK_SECRET = "wave-webhook";
process.env.SASPAY_SECRET_KEY = "sk_test_signature";
process.env.SASPAY_WEBHOOK_SECRET = "saspay-webhook";

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

describe("SasPay webhook signatures", () => {
  const body = '{"event":"transaction.success","data":{"id":"7c1a"}}';
  const now = 1_760_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const sign = (ts: string, payload: string) => createHmac("sha256", "saspay-webhook").update(`${ts}.${payload}`).digest("hex");

  it("accepts the exact HMAC over timestamp.body", () => {
    const client = getSaspayClient();
    expect(client.verifyWebhookSignature(body, sign(timestamp, body), timestamp, now)).toBe(true);
  });

  it("refuses a tampered body, signature or secret", () => {
    const client = getSaspayClient();
    const signature = sign(timestamp, body);
    expect(client.verifyWebhookSignature('{"event":"transaction.success","data":{"id":"evil"}}', signature, timestamp, now)).toBe(false);
    expect(client.verifyWebhookSignature(body, `${signature}00`, timestamp, now)).toBe(false);
    expect(client.verifyWebhookSignature(body, createHmac("sha256", "wrong").update(`${timestamp}.${body}`).digest("hex"), timestamp, now)).toBe(false);
  });

  it("refuses a signature computed without the timestamp prefix", () => {
    // Le piège de l'intégration : signer seulement le corps laisse le webhook rejouable.
    const client = getSaspayClient();
    const bodyOnly = createHmac("sha256", "saspay-webhook").update(body).digest("hex");
    expect(client.verifyWebhookSignature(body, bodyOnly, timestamp, now)).toBe(false);
  });

  it("refuses a replay outside the five-minute window, in both directions", () => {
    const client = getSaspayClient();
    const old = String(Math.floor(now / 1000) - 301);
    const ahead = String(Math.floor(now / 1000) + 301);
    expect(client.verifyWebhookSignature(body, sign(old, body), old, now)).toBe(false);
    expect(client.verifyWebhookSignature(body, sign(ahead, body), ahead, now)).toBe(false);
  });

  it("still accepts a webhook that arrives a little late", () => {
    const client = getSaspayClient();
    const late = String(Math.floor(now / 1000) - 299);
    expect(client.verifyWebhookSignature(body, sign(late, body), late, now)).toBe(true);
  });

  it("refuses a missing or non-numeric timestamp", () => {
    const client = getSaspayClient();
    expect(client.verifyWebhookSignature(body, sign(timestamp, body), "", now)).toBe(false);
    expect(client.verifyWebhookSignature(body, sign("abc", body), "abc", now)).toBe(false);
  });
});
