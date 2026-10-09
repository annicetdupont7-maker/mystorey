import { describe, expect, it } from "vitest";
import { DELETION_PHRASE, archiveRowsFor } from "./deletion";

const STORE = { id: "store-1", name: "Chez Awa", slug: "chez-awa" };
const ORDER = {
  id: "order-1",
  store_id: "store-1",
  items: [{ productId: "p1", quantity: 2, name: "Robe" }],
  total: 30000,
  status: "delivered",
  created_at: "2026-10-01T10:00:00.000Z",
  // Les colonnes que la base contient vraiment et qui ne doivent jamais ressortir.
  customer_name: "Cliente Réelle",
  customer_phone: "+22997000000",
  note: "Livrer devant la pharmacie",
};

describe("archiveRowsFor", () => {
  it("garde ce que la comptabilité exige", () => {
    const [row] = archiveRowsFor([STORE], [ORDER]);
    expect(row.order_id).toBe("order-1");
    expect(row.store_id).toBe("store-1");
    expect(row.store_name).toBe("Chez Awa");
    expect(row.total).toBe(30000);
    expect(row.status).toBe("delivered");
    expect(row.ordered_at).toBe("2026-10-01T10:00:00.000Z");
    expect(row.items).toEqual([{ productId: "p1", quantity: 2, name: "Robe" }]);
    expect(row.reason).toBe("account_deleted");
  });

  it("n'emporte aucune donnée de la cliente", () => {
    const [row] = archiveRowsFor([STORE], [ORDER]);
    // Le test porte sur la ligne entière, pas sur trois champs connus : une colonne
    // ajoutée plus tard aux commandes ne doit pas se glisser dans l'archive en silence.
    expect(Object.keys(row).sort()).toEqual(["items", "order_id", "ordered_at", "reason", "status", "store_id", "store_name", "store_slug", "total"]);
    expect(JSON.stringify(row)).not.toContain("Cliente Réelle");
    expect(JSON.stringify(row)).not.toContain("+22997000000");
    expect(JSON.stringify(row)).not.toContain("pharmacie");
  });

  it("survit à une boutique déjà introuvable et à des colonnes vides", () => {
    const [row] = archiveRowsFor([], [{ id: "order-2", store_id: "disparue", created_at: "2026-10-02T10:00:00.000Z" }]);
    expect(row.store_name).toBe("");
    expect(row.store_slug).toBe("");
    expect(row.total).toBe(0);
    expect(row.status).toBe("");
    expect(row.items).toEqual([]);
  });

  it("ne renvoie rien quand il n'y a aucune commande", () => {
    expect(archiveRowsFor([STORE], [])).toEqual([]);
  });

  it("exige une phrase de confirmation qui ne s'écrit pas par accident", () => {
    expect(DELETION_PHRASE).toBe("SUPPRIMER MON COMPTE");
  });
});
