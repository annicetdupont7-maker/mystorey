import { describe, expect, it } from "vitest";
import { buildNewOrderEmail } from "./order-email";
import { formatPrice } from "@/features/storefront/storefront-types";
import type { OrderMessageView } from "./messages";

const order: OrderMessageView = {
  order_number: "VF-0042",
  customer_name: "Awa Diallo",
  customer_phone: "+229 97 00 00 00",
  customer_address: "Cotonou, Fidjrossè",
  note: "Taille M",
  items: [
    { productId: "p1", name: "Robe longue — Rouge", unitPrice: 15000, quantity: 2 },
    { productId: "p2", name: "Sac", unitPrice: 9000, quantity: 1 },
  ],
  total: 39000,
};

describe("buildNewOrderEmail", () => {
  it("met le numéro et le montant dans l'objet, pour être lisible dans une liste d'emails", () => {
    const mail = buildNewOrderEmail(order, "Maison Naya", "https://mystorey.vercel.app/dashboard/orders");
    expect(mail.subject).toContain("#VF-0042");
    expect(mail.subject).toContain("39 000 FCFA");
  });

  it("donne à la vendeuse tout ce qu'il faut pour rappeler la cliente sans ouvrir le site", () => {
    const mail = buildNewOrderEmail(order, "Maison Naya", "https://mystorey.vercel.app/dashboard/orders");
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain("Awa Diallo");
      expect(body).toContain("+229 97 00 00 00");
      expect(body).toContain("Cotonou, Fidjrossè");
      expect(body).toContain("Robe longue — Rouge");
      expect(body).toContain("Maison Naya");
    }
    expect(mail.text).toContain("Taille M");
    expect(mail.html).toContain("https://mystorey.vercel.app/dashboard/orders");
  });

  it("affiche le total de la ligne, pas le prix unitaire, pour éviter une lecture fausse", () => {
    const mail = buildNewOrderEmail(order, "Maison Naya", "https://x.test/dashboard/orders");
    // formatPrice sépare les milliers par une espace fine insécable : on compare
    // à ce qu’il produit, pas à une espace tapée à la main.
    expect(mail.text).toContain(`2 × Robe longue — Rouge — ${formatPrice(30000)}`);
  });

  it("échappe le HTML : un nom de boutique ou de cliente ne peut pas injecter de balise", () => {
    const hostile: OrderMessageView = { ...order, customer_name: '<script>alert(1)</script>', note: "" };
    const mail = buildNewOrderEmail(hostile, '<img src=x onerror="alert(1)">', "https://x.test/dashboard/orders");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("tient debout sans numéro de commande ni champs facultatifs", () => {
    const bare: OrderMessageView = { ...order, order_number: null, customer_address: "", note: "", customer_phone: "" };
    const mail = buildNewOrderEmail(bare, "Boutique", "https://x.test/dashboard/orders");
    expect(mail.subject).not.toContain("#");
    expect(mail.text).toContain("(sans numéro)");
    expect(mail.text).not.toContain("Livraison :");
    expect(mail.text).not.toContain("Téléphone :");
  });
});
