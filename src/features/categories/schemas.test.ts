import { describe, expect, it } from "vitest";
import { categoryFormSchema, categoryNameSchema, categoryRenameSchema } from "./schemas";

describe("category schemas", () => {
  it("accepte un nom valide pour la création", () => {
    expect(categoryNameSchema.safeParse("Vêtements").success).toBe(true);
    expect(categoryFormSchema.safeParse({ storeId: "s1", name: "Vêtements" }).success).toBe(true);
  });
  it("rejette un nom vide ou trop long", () => {
    expect(categoryNameSchema.safeParse("   ").success).toBe(false);
    expect(categoryNameSchema.safeParse("x".repeat(61)).success).toBe(false);
  });
  it("rejette une catégorie sans boutique ou sans id", () => {
    expect(categoryFormSchema.safeParse({ storeId: "", name: "Chaussures" }).success).toBe(false);
    expect(categoryRenameSchema.safeParse({ storeId: "s1", categoryId: "", name: "Chaussures" }).success).toBe(false);
  });
  it("accepte un renommage complet", () => {
    expect(categoryRenameSchema.safeParse({ storeId: "s1", categoryId: "c1", name: "Chaussures" }).success).toBe(true);
  });
});