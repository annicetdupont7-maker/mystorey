import { describe, expect, it } from "vitest";
import { buildLaunchSteps, isLaunchReady, nextLaunchStep, publishBlockers } from "./launch";

const fresh = { storeStatus: "draft", whatsapp: null, themeChosen: true, productCount: 0, publishedProductCount: 0 };

describe("checklist de lancement", () => {
  it("une boutique neuve : créée et thème choisi, le reste à faire", () => {
    const steps = buildLaunchSteps(fresh);
    expect(steps.map((s) => [s.id, s.done])).toEqual([
      ["store", true], ["theme", true], ["whatsapp", false], ["product", false],
      ["product_published", false], ["store_published", false], ["link", false],
    ]);
    expect(nextLaunchStep(steps)?.id).toBe("whatsapp");
    expect(isLaunchReady(steps)).toBe(false);
  });
  it("prête quand tout est fait", () => {
    const steps = buildLaunchSteps({ storeStatus: "published", whatsapp: "+229 01 97 00 00 00", themeChosen: true, productCount: 3, publishedProductCount: 2 });
    expect(isLaunchReady(steps)).toBe(true);
    expect(nextLaunchStep(steps)).toBeNull();
  });
  it("en ligne sans WhatsApp : le lien n'est PAS prêt", () => {
    const steps = buildLaunchSteps({ storeStatus: "published", whatsapp: "", themeChosen: true, productCount: 1, publishedProductCount: 1 });
    expect(steps.find((s) => s.id === "link")?.done).toBe(false);
    expect(steps.find((s) => s.id === "link")?.hint).toMatch(/WhatsApp/);
  });
  it("des produits tous masqués ne comptent pas comme publiés", () => {
    const steps = buildLaunchSteps({ ...fresh, whatsapp: "+22997000000", productCount: 2, publishedProductCount: 0 });
    expect(steps.find((s) => s.id === "product")?.done).toBe(true);
    expect(steps.find((s) => s.id === "product_published")?.done).toBe(false);
  });
});

describe("publishBlockers", () => {
  it("bloque une boutique vide et sans numéro, en expliquant pourquoi", () => {
    const blockers = publishBlockers({ whatsapp: null, productCount: 0, publishedProductCount: 0 });
    expect(blockers).toHaveLength(2);
    expect(blockers[0]).toMatch(/produit/);
    expect(blockers[1]).toMatch(/WhatsApp/);
  });
  it("laisse publier avec un produit visible et un numéro", () => {
    expect(publishBlockers({ whatsapp: "+229 97 00 00 00", productCount: 1, publishedProductCount: 1 })).toEqual([]);
  });
  it("un numéro trop court ne compte pas", () => {
    expect(publishBlockers({ whatsapp: "+229 12", productCount: 1, publishedProductCount: 1 })).toHaveLength(1);
  });
});
