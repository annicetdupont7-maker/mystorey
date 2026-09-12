import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsAppLink, buildWhatsAppOrderDraft, cartLineKey, cartLineName, normalizeWhatsAppNumber } from "./whatsapp";
describe("normalizeWhatsAppNumber", () => {
  it("ne garde que les chiffres", () => { expect(normalizeWhatsAppNumber("+237 6 90 00 00 00")).toBe("237690000000"); });
  it("retourne une chaîne vide sans chiffres", () => { expect(normalizeWhatsAppNumber("(aucun)")).toBe(""); });
});
describe("buildOrderMessage", () => {
  it("compose les lignes et le total", () => {
    const items = [{ id: "1", key: "1", name: "Sac Studio", unitPrice: 19500, quantity: 2 }, { id: "2", key: "2", name: "Veste Horizon", unitPrice: 28000, quantity: 1 }];
    expect(buildOrderMessage(items, "Amina Fashion")).toBe(`Bonjour Amina Fashion 👋\n\nJe souhaite commander :\n• Sac Studio : 2 × 19\u202F500 FCFA = 39\u202F000 FCFA\n• Veste Horizon : 1 × 28\u202F000 FCFA = 28\u202F000 FCFA\n\nTotal : 67\u202F000 FCFA\n\nMerci ! (via MYSTOREY)`);
  });
  it("retourne une chaîne vide sans article", () => { expect(buildOrderMessage([], "Amina Fashion")).toBe(""); });
});
describe("buildWhatsAppLink", () => {
  it("construit le lien wa.me avec message encodé", () => {
    const url = buildWhatsAppLink("+237 6 90 00 00 00", "Bonjour Amina Fashion 👋\n\nTotal : 67\u202F000 FCFA") ?? "";
    expect(url.startsWith("https://wa.me/237690000000?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Total : 67\u202F000 FCFA");
  });
  it("retourne null si aucun numéro", () => { expect(buildWhatsAppLink("  ", "commande")).toBeNull(); });
});
describe("buildWhatsAppOrderDraft", () => {
  it("inclut la boutique, les quantités, le total et les champs client", () => {
    const draft = buildWhatsAppOrderDraft([{ id: "1", key: "1", name: "Sac Studio", unitPrice: 19500, quantity: 2 }], "Amina Fashion");
    expect(draft).toContain("auprès de Amina Fashion");
    expect(draft).toContain("Sac Studio × 2 : 39");
    expect(draft).toContain("Total estimé");
    expect(draft).toContain("Nom :");
    expect(draft).toContain("Adresse ou lieu de livraison :");
  });
});

describe("lignes de panier avec variantes", () => {
  it("sépare deux variantes du même produit", () => {
    expect(cartLineKey("p1", "v-rouge")).toBe("p1:v-rouge");
    expect(cartLineKey("p1", "v-bleu")).not.toBe(cartLineKey("p1", "v-rouge"));
  });

  it("garde l’identifiant produit comme clé quand il n’y a pas de variante", () => {
    expect(cartLineKey("p1")).toBe("p1");
    expect(cartLineKey("p1", null)).toBe("p1");
  });

  it("nomme la ligne avec la variante choisie", () => {
    expect(cartLineName({ name: "Robe Boro", variantLabel: "Rouge" })).toBe("Robe Boro — Rouge");
    expect(cartLineName({ name: "Robe Boro", variantLabel: null })).toBe("Robe Boro");
  });

  it("fait apparaître la variante dans le message WhatsApp — c’est ce que la vendeuse doit préparer", () => {
    const items = [
      { id: "p1", key: "p1:v1", name: "Robe Boro", variantLabel: "Rouge", unitPrice: 25000, quantity: 1 },
      { id: "p1", key: "p1:v2", name: "Robe Boro", variantLabel: "Bleu", unitPrice: 25000, quantity: 2 },
    ];
    const draft = buildWhatsAppOrderDraft(items, "Amina Fashion");
    expect(draft).toContain("Robe Boro — Rouge × 1");
    expect(draft).toContain("Robe Boro — Bleu × 2");
    expect(buildOrderMessage(items, "Amina Fashion")).toContain("Robe Boro — Bleu : 2 ×");
  });
});