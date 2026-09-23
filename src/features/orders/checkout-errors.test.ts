import { describe, expect, it } from "vitest";
import { checkoutErrorMessage, looksAutomated } from "./checkout-errors";

describe("checkoutErrorMessage", () => {
  it("dit à la cliente d'attendre quand la garde anti-inondation a refusé sa commande", () => {
    // Le message Postgres arrive enveloppé ; c'est le vrai format reçu par l'action.
    const message = checkoutErrorMessage('new row violates ... raise exception "checkout_rate_limited"');
    expect(message).toMatch(/patientez quelques minutes/i);
  });

  it("nomme la cause quand la cliente peut agir", () => {
    expect(checkoutErrorMessage("checkout_insufficient_stock")).toMatch(/quantité/i);
    expect(checkoutErrorMessage("checkout_variant_not_found")).toMatch(/choix/i);
    expect(checkoutErrorMessage("checkout_product_not_found")).toMatch(/article/i);
    expect(checkoutErrorMessage("checkout_store_unavailable")).toMatch(/boutique/i);
    expect(checkoutErrorMessage("checkout_store_not_found")).toMatch(/boutique/i);
  });

  it("reste vague sur une erreur inconnue plutôt que de laisser fuiter du SQL", () => {
    const message = checkoutErrorMessage('duplicate key value violates unique constraint "orders_pkey"');
    expect(message).toBe("Impossible d’enregistrer votre commande. Réessayez.");
    expect(message).not.toMatch(/constraint|orders_pkey/);
  });
});

describe("looksAutomated", () => {
  it("laisse passer un champ piège vide, absent ou seulement blanc", () => {
    expect(looksAutomated("")).toBe(false);
    expect(looksAutomated(null)).toBe(false);
    expect(looksAutomated("   ")).toBe(false);
  });

  it("refuse dès que le champ invisible a été rempli", () => {
    expect(looksAutomated("http://spam.example")).toBe(true);
  });
});
