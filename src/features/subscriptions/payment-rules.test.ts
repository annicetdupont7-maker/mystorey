import { describe, expect, it } from "vitest";
import { canAddProduct, getPlanById } from "./types";
import { paymentAmountMatches, subscriptionIsActive } from "./payment-rules";

describe("subscription launch rules", () => {
  it("uses the commercial product limits", () => {
    expect(getPlanById("free").productLimit).toBe(10);
    expect(getPlanById("growth").productLimit).toBe(20);
    expect(getPlanById("pro").productLimit).toBe(100);
    expect(canAddProduct(9, "free")).toBe(true);
    expect(canAddProduct(10, "free")).toBe(false);
    expect(canAddProduct(20, "growth")).toBe(false);
    expect(canAddProduct(19, "growth")).toBe(true);
  });

  it("keeps XOF amounts as exact integer FCFA values", () => {
    expect(paymentAmountMatches(2000, 2000)).toBe(true);
    expect(paymentAmountMatches(2000, 200000)).toBe(false);
    expect(paymentAmountMatches(5000, 4999)).toBe(false);
  });

  it("rejects failed and expired subscriptions", () => {
    expect(subscriptionIsActive({ status: "active", payment_status: "paid", expires_at: "2026-09-05T00:00:00.000Z" }, Date.parse("2026-09-04T00:00:00.000Z"))).toBe(true);
    expect(subscriptionIsActive({ status: "active", payment_status: "paid", expires_at: "2026-09-03T00:00:00.000Z" }, Date.parse("2026-09-04T00:00:00.000Z"))).toBe(false);
    expect(subscriptionIsActive({ status: "pending", payment_status: "pending" })).toBe(false);
  });
});
