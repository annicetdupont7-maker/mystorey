import { describe, expect, it } from "vitest";
import { buildCheckoutMessage, buildStatusNoticeMessage, type OrderMessageView } from "./messages";
import { buildWhatsAppLink } from "@/features/storefront/whatsapp";

const order = (overrides: Partial<OrderMessageView> = {}): OrderMessageView => ({
  order_number: "VF-1042",
  customer_name: "Sarah",
  customer_phone: "+229 97 00 00 00",
  customer_address: "Abomey-Calavi",
  note: "Merci de livrer demain matin.",
  items: [
    { productId: "p1", name: "Robe", unitPrice: 15000, quantity: 2 },
    { productId: "p2", name: "Sac", unitPrice: 8000, quantity: 1 },
  ],
  total: 38000,
  ...overrides,
});

describe("buildCheckoutMessage", () => {
  it("compose le numéro, le client, l'adresse et le total", () => {
    const msg = buildCheckoutMessage(order());
    expect(msg).toContain("🛍️ Nouvelle commande VendoFlow");
    expect(msg).toContain("Commande #VF-1042");
    expect(msg).toContain("Client : Sarah");
    expect(msg).toContain("Téléphone : +229 97 00 00 00");
    expect(msg).toContain("Livraison : Abomey-Calavi");
    expect(msg).toContain("• 2 × Robe — 15\u202F000 FCFA = 30\u202F000 FCFA");
    expect(msg).toContain("• 1 × Sac — 8\u202F000 FCFA = 8\u202F000 FCFA");
    expect(msg).toContain("Total : 38\u202F000 FCFA");
    expect(msg).toContain("Note :");
    expect(msg).toContain("Merci de livrer demain matin.");
  });
  it("traite une commande sans note, sans adresse, sans téléphone", () => {
    const msg = buildCheckoutMessage(order({ note: "", customer_address: "", customer_phone: "", items: [{ productId: "p1", name: "Robe", unitPrice: 15000, quantity: 1 }], total: 15000 }));
    expect(msg).toContain("• 1 × Robe — 15\u202F000 FCFA = 15\u202F000 FCFA");
    expect(msg).toContain("Total : 15\u202F000 FCFA");
    expect(msg).not.toContain("Note :");
    expect(msg).not.toContain("Téléphone :");
    expect(msg).not.toContain("Livraison :");
  });
  it("sait calculer le total par ligne à partir des quantités", () => {
    const msg = buildCheckoutMessage(order({ items: [{ productId: "p3", name: "Sandales", unitPrice: 9000, quantity: 3 }], total: 27000 }));
    expect(msg).toContain("• 3 × Sandales — 9\u202F000 FCFA = 27\u202F000 FCFA");
    expect(msg).toContain("Total : 27\u202F000 FCFA");
  });
  it("reste lisible avec plusieurs produits identiques en quantités", () => {
    const msg = buildCheckoutMessage(order({ items: [
      { productId: "p1", name: "Robe", unitPrice: 15000, quantity: 2 },
      { productId: "p1", name: "Robe", unitPrice: 15000, quantity: 1 },
    ], total: 45000 }));
    expect(msg).toContain("• 2 × Robe");
    expect(msg).toContain("• 1 × Robe");
    expect(msg).toContain("Total : 45\u202F000 FCFA");
  });
});

describe("buildStatusNoticeMessage", () => {
  it("génère le messages de confirmation demandé", () => {
    expect(buildStatusNoticeMessage("VF-1042", "confirmed", "Sarah")).toBe("Bonjour Sarah 👋 Votre commande #VF-1042 est confirmée. Nous allons maintenant la préparer.");
  });
  it("génère les messages de livraison", () => {
    expect(buildStatusNoticeMessage("VF-1042", "shipped", "Sarah")).toBe("🚚 Votre commande #VF-1042 est en cours de livraison.");
    expect(buildStatusNoticeMessage("VF-1042", "delivered", "Sarah")).toBe("✅ Votre commande #VF-1042 a été livrée. Merci pour votre commande ❤️");
  });
  it("gère l'absence de numéro", () => {
    expect(buildStatusNoticeMessage(null, "confirmed", "Sarah")).toContain("#……");
  });
  it("produit un lien WhatsApp correctement encodé", () => {
    const link = buildWhatsAppLink("+229 97 00 00 00", buildStatusNoticeMessage("VF-1042", "confirmed", "Sarah"));
    expect(link?.startsWith("https://wa.me/22997000000?text=")).toBe(true);
    expect(decodeURIComponent(link ?? "")).toContain("Votre commande #VF-1042 est confirmée");
  });
});