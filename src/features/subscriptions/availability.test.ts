import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { paidPlansArePurchasable } from "./availability";

const KEYS = ["KKIAPAY_PAYMENTS_ENABLED", "KKIAPAY_PUBLIC_KEY", "KKIAPAY_PRIVATE_KEY", "KKIAPAY_WEBHOOK_SECRET"] as const;
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

const withLiveKeys = () => {
  process.env.KKIAPAY_PUBLIC_KEY = "pk_live";
  process.env.KKIAPAY_PRIVATE_KEY = "sk_live";
  process.env.KKIAPAY_WEBHOOK_SECRET = "whsec";
};

describe("paid plan availability", () => {
  it("is closed when nothing is configured", () => {
    expect(paidPlansArePurchasable()).toBe(false);
  });

  it("stays closed while the flag is off, even with keys present", () => {
    withLiveKeys();
    expect(paidPlansArePurchasable()).toBe(false);
  });

  it("stays closed when the flag is on but a key is missing", () => {
    process.env.KKIAPAY_PAYMENTS_ENABLED = "true";
    process.env.KKIAPAY_PUBLIC_KEY = "pk_live";
    process.env.KKIAPAY_PRIVATE_KEY = "sk_live";
    expect(paidPlansArePurchasable()).toBe(false);
  });

  it("only accepts the exact string \"true\", so a stray value cannot open checkout", () => {
    withLiveKeys();
    for (const value of ["1", "yes", "TRUE", "on", ""]) {
      process.env.KKIAPAY_PAYMENTS_ENABLED = value;
      expect(paidPlansArePurchasable()).toBe(false);
    }
  });

  it("opens once the flag and the three keys are set", () => {
    withLiveKeys();
    process.env.KKIAPAY_PAYMENTS_ENABLED = "true";
    expect(paidPlansArePurchasable()).toBe(true);
  });
});
