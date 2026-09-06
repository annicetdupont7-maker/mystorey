import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsAppLink, normalizeWhatsAppNumber } from "./whatsapp";
describe("normalizeWhatsAppNumber", () => {
  it("ne garde que les chiffres", () => { expect(normalizeWhatsAppNumber("+237 6 90 00 00 00")).toBe("237690000000"); });
  it("retourne une chaîne vide sans chiffres", () => { expect(normalizeWhatsAppNumber("(aucun)")).toBe(""); });
});
describe("buildOrderMessage", () => {
  it("compose les lignes et le total", () => {
    const items = [{ id: "1", name: "Sac Studio", unitPrice: 19500, quantity: 2 }, { id: "2", name: "Veste Horizon", unitPrice: 28000, quantity: 1 }];
    expect(buildOrderMessage(items, "Amina Fashion")).toBe(`Bonjour Amina Fashion 👋\n\nJe souhaite commander :\n• Sac Studio : 2 × 19\u202F500 FCFA = 39\u202F000 FCFA\n• Veste Horizon : 1 × 28\u202F000 FCFA = 28\u202F000 FCFA\n\nTotal : 67\u202F000 FCFA\n\nMerci ! (via VendoFlow)`);
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