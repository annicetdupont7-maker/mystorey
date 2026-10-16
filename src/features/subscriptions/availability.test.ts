import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { kkiapayPaidPlansArePurchasable, paidPlansArePurchasable, saspayPaidPlansArePurchasable } from "./availability";

const KEYS = [
  "SASPAY_PAYMENTS_ENABLED",
  "SASPAY_SECRET_KEY",
  "SASPAY_WEBHOOK_SECRET",
  "KKIAPAY_PAYMENTS_ENABLED",
  "KKIAPAY_PUBLIC_KEY",
  "KKIAPAY_PRIVATE_KEY",
  "KKIAPAY_WEBHOOK_SECRET",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const withLiveSaspayKeys = () => {
  process.env.SASPAY_SECRET_KEY = "sk_live_xxx";
  process.env.SASPAY_WEBHOOK_SECRET = "whsec";
};

describe("paid plan availability", () => {
  it("is closed when nothing is configured", () => {
    expect(paidPlansArePurchasable()).toBe(false);
  });

  it("stays closed while the flag is off, even with keys present", () => {
    withLiveSaspayKeys();
    expect(paidPlansArePurchasable()).toBe(false);
  });

  it("stays closed when the flag is on but the webhook secret is missing", () => {
    process.env.SASPAY_PAYMENTS_ENABLED = "true";
    process.env.SASPAY_SECRET_KEY = "sk_live_xxx";
    expect(paidPlansArePurchasable()).toBe(false);
  });

  it('only accepts the exact string "true", so a stray value cannot open checkout', () => {
    withLiveSaspayKeys();
    for (const value of ["1", "yes", "TRUE", "on", ""]) {
      process.env.SASPAY_PAYMENTS_ENABLED = value;
      expect(paidPlansArePurchasable()).toBe(false);
    }
  });

  it("opens once the flag and both SasPay keys are set", () => {
    withLiveSaspayKeys();
    process.env.SASPAY_PAYMENTS_ENABLED = "true";
    expect(paidPlansArePurchasable()).toBe(true);
    expect(saspayPaidPlansArePurchasable()).toBe(true);
  });
});

describe("providers stay independent", () => {
  // Les deux prestataires ont leur propre interrupteur : ouvrir l'un ne doit jamais
  // rouvrir l'autre, sinon un reste de clés Kkiapay suffirait à encaisser ailleurs.
  it("does not open Kkiapay when SasPay is live", () => {
    withLiveSaspayKeys();
    process.env.SASPAY_PAYMENTS_ENABLED = "true";
    expect(kkiapayPaidPlansArePurchasable()).toBe(false);
  });

  it("does not open the checkout when only Kkiapay is configured", () => {
    process.env.KKIAPAY_PAYMENTS_ENABLED = "true";
    process.env.KKIAPAY_PUBLIC_KEY = "pk_live";
    process.env.KKIAPAY_PRIVATE_KEY = "sk_live";
    process.env.KKIAPAY_WEBHOOK_SECRET = "whsec";
    expect(kkiapayPaidPlansArePurchasable()).toBe(true);
    expect(paidPlansArePurchasable()).toBe(false);
  });
});
