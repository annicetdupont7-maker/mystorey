import { describe, expect, it } from "vitest";
import { productStockSchema, variantSchema } from "./schemas";

const base = { productId: "p1", optionGroup: "Couleur", label: "Rouge" };

describe("variant schema", () => {
  it("accepts a variant with neither price nor stock", () => {
    const out = variantSchema.parse(base);
    expect(out.price).toBeNull();
    expect(out.stock).toBeNull();
  });

  it("treats a blank field as not set rather than zero", () => {
    const out = variantSchema.parse({ ...base, price: "", stock: "  " });
    expect(out.price).toBeNull();
    expect(out.stock).toBeNull();
  });

  it("keeps an explicit zero stock, which means sold out", () => {
    expect(variantSchema.parse({ ...base, stock: "0" }).stock).toBe(0);
  });

  it("reads numbers when provided", () => {
    const out = variantSchema.parse({ ...base, price: "30000", stock: "12" });
    expect(out.price).toBe(30000);
    expect(out.stock).toBe(12);
  });

  it("rejects a non-numeric or negative value", () => {
    expect(variantSchema.safeParse({ ...base, price: "abc" }).success).toBe(false);
    expect(variantSchema.safeParse({ ...base, stock: "-3" }).success).toBe(false);
    expect(variantSchema.safeParse({ ...base, price: "12,50" }).success).toBe(false);
  });

  it("requires a label and a group", () => {
    expect(variantSchema.safeParse({ ...base, label: "" }).success).toBe(false);
    expect(variantSchema.safeParse({ ...base, optionGroup: "" }).success).toBe(false);
    expect(variantSchema.safeParse({ ...base, label: "x".repeat(41) }).success).toBe(false);
  });
});

describe("product stock schema", () => {
  it("maps an empty value to not tracked", () => {
    expect(productStockSchema.parse("")).toBeNull();
    expect(productStockSchema.parse(undefined)).toBeNull();
  });

  it("accepts zero and positive integers", () => {
    expect(productStockSchema.parse("0")).toBe(0);
    expect(productStockSchema.parse("25")).toBe(25);
  });
});
