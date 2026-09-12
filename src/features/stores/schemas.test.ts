import { describe, expect, it } from "vitest";
import { onboardingSchema, slugSchema, storeIdentitySchema, storeSettingsSchema } from "./schemas";

describe("store onboarding", () => {
  it("normal slug is accepted", () => expect(slugSchema.safeParse("amina-fashion").success).toBe(true));
  it("rejects unsafe slug", () => expect(slugSchema.safeParse("Amina Fashion<script>").success).toBe(false));
  it("requires a known theme", () => expect(onboardingSchema.safeParse({ name: "Amina Fashion", slug: "amina-fashion", presetId: "unknown" }).success).toBe(false));
});

describe("store identity schema", () => {
  it("accepts a valid identity", () =>
    expect(storeIdentitySchema.safeParse({ name: "Maison Naya", slogan: "Des pièces qui vous ressemblent.", description: "Notre histoire.", whatsapp: "" }).success).toBe(true));

  it("leaves absent fields undefined so a partial form cannot erase them", () => {
    const out = storeIdentitySchema.parse({ name: "Maison Naya" });
    expect(out.slogan).toBeUndefined();
    expect(out.description).toBeUndefined();
    expect(out.whatsapp).toBeUndefined();
  });

  it("still accepts an explicit blank value when the seller really clears a field", () => {
    const out = storeIdentitySchema.parse({ name: "Maison Naya", slogan: "", description: "", whatsapp: "" });
    expect(out.slogan).toBe("");
    expect(out.description).toBe("");
    expect(out.whatsapp).toBe("");
  });

  it("rejects an overlong slogan", () => expect(storeIdentitySchema.safeParse({ name: "Maison Naya", slogan: "x".repeat(121) }).success).toBe(false));
  it("rejects an overlong description", () => expect(storeIdentitySchema.safeParse({ name: "Maison Naya", description: "x".repeat(501) }).success).toBe(false));
  it("rejects a malformed whatsapp number", () => expect(storeIdentitySchema.safeParse({ name: "Maison Naya", whatsapp: "42435105" }).success).toBe(false));
});

describe("whatsapp schema", () => {
  it("accepts an international number", () =>
    expect(onboardingSchema.safeParse({ name: "Amina Fashion", slug: "amina-fashion", presetId: "elegant", whatsapp: "+237 6 90 00 00 00" }).success).toBe(true));
  it("accepts an empty optional number", () =>
    expect(onboardingSchema.safeParse({ name: "Amina Fashion", slug: "amina-fashion", presetId: "elegant", whatsapp: "" }).success).toBe(true));
  it("rejects a malformed number", () =>
    expect(onboardingSchema.safeParse({ name: "Amina Fashion", slug: "amina-fashion", presetId: "elegant", whatsapp: "abc" }).success).toBe(false));
  it("rejects a local number without country code", () =>
    expect(onboardingSchema.safeParse({ name: "Amina Fashion", slug: "amina-fashion", presetId: "elegant", whatsapp: "42435105" }).success).toBe(false));
  it("validates store settings", () =>
    expect(storeSettingsSchema.safeParse({ name: "Amina Fashion", description: "Mode", whatsapp: "+237690000000" }).success).toBe(true));
});
