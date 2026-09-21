import { describe, expect, it } from "vitest";
import { countryOf, isPlausiblePhone, joinPhone, splitPhone } from "./phone";

describe("joinPhone", () => {
  it("ajoute l'indicatif au numéro local tapé par la vendeuse", () => {
    expect(joinPhone("229", "01 97 00 00 00")).toBe("+229 01 97 00 00 00");
    expect(joinPhone("237", "690000000")).toBe("+237 6 90 00 00 00");
  });
  it("retire le 0 national là où il le faut (France, Maroc…)", () => {
    expect(joinPhone("33", "06 12 34 56 78")).toBe("+33 6 12 34 56 78");
    expect(joinPhone("212", "0612345678")).toBe("+212 6 12 34 56 78");
  });
  it("garde un numéro déjà international tel quel", () => {
    expect(joinPhone("229", "+225 07 00 00 00 00")).toBe("+2250700000000");
    expect(joinPhone("229", "00225 0700000000")).toBe("+2250700000000");
  });
  it("renvoie une chaîne vide si rien n'est tapé", () => { expect(joinPhone("229", "  ")).toBe(""); });
});

describe("splitPhone", () => {
  it("retrouve le pays d'un numéro enregistré", () => {
    expect(splitPhone("+229 01 97 00 00 00")).toEqual({ code: "229", local: "01 97 00 00 00" });
    expect(splitPhone("+33612345678").code).toBe("33");
  });
  it("utilise le pays par défaut pour un numéro vide ou local", () => {
    expect(splitPhone("", "225")).toEqual({ code: "225", local: "" });
    expect(splitPhone("97000000")).toEqual({ code: "229", local: "97000000" });
  });
  it("aller-retour stable", () => {
    const stored = joinPhone("228", "90 00 00 00");
    const { code, local } = splitPhone(stored);
    expect(joinPhone(code, local)).toBe(stored);
  });
  it("devine le pays de la cliente à partir de celui de la boutique", () => { expect(countryOf("+237 6 90 00 00 00")).toBe("237"); });
});

describe("isPlausiblePhone", () => {
  it("accepte un numéro international complet", () => { expect(isPlausiblePhone("+229 01 97 00 00 00")).toBe(true); });
  it("refuse un numéro trop court ou sans indicatif", () => {
    expect(isPlausiblePhone("+229 12")).toBe(false);
    expect(isPlausiblePhone("97000000")).toBe(false);
    expect(isPlausiblePhone("")).toBe(false);
  });
});
