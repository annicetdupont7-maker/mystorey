import { describe, expect, it } from "vitest";
import { buildFacebookShareUrl, buildShareMessages, buildStoreShareMessages, buildWhatsAppShareUrl, productShareUrl, qrCodeUrl, storeShareUrl } from "./share";

const payload = { title: "Robe noire", price: 12000, productId: "prod-123", storeSlug: "naya-store", baseUrl: "https://mystorey.app" };

describe("product deep link", () => {
  it("points directly to the product page", () => expect(productShareUrl(payload)).toBe("https://mystorey.app/store/naya-store/produit/prod-123"));
});

describe("store link", () => {
  it("points to the store page", () => expect(storeShareUrl("naya-store", "https://mystorey.app")).toBe("https://mystorey.app/store/naya-store"));
});

describe("product share messages", () => {
  it("mentions name, price and the deep link", () => {
    const messages = buildShareMessages(payload);
    for (const text of Object.values(messages)) {
      expect(text).toContain("Robe noire");
      expect(text).toContain("12 000 F CFA");
      expect(text).toContain("naya-store/produit/prod-123");
    }
  });
});

describe("store share messages", () => {
  it("mentions the store and its link", () => {
    const messages = buildStoreShareMessages("Maison Naya", "naya-store", "https://mystorey.app");
    for (const text of Object.values(messages)) {
      expect(text).toContain("Maison Naya");
      expect(text).toContain("mystorey.app/store/naya-store");
    }
  });
});

describe("share urls", () => {
  it("encodes WhatsApp and Facebook links safely", () => {
    const messages = buildShareMessages(payload);
    expect(buildWhatsAppShareUrl(messages.whatsapp)).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(buildFacebookShareUrl("https://mystorey.app/store/naya-store?x=1")).toContain("sharer.php?u=https%3A%2F%2F");
  });
  it("builds a QR image URL", () => {
    const url = qrCodeUrl("https://mystorey.app/store/naya-store/produit/prod-123");
    expect(url).toContain("api.qrserver.com");
    expect(url).toContain("prod-123");
  });
});