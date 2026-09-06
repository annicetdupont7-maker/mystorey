export type CategoryRef = { id: string; name: string };
export type CategorizedProduct = { id: string; categoryId: string | null; is_available?: boolean };
export const ALL_CATEGORIES = "__all__";

export function filterProductsByCategory<T extends CategorizedProduct>(products: T[], categoryId: string | null): T[] {
  if (!categoryId || categoryId === ALL_CATEGORIES) return products;
  return products.filter((p) => p.categoryId === categoryId);
}

export function categoriesWithProducts<T extends CategorizedProduct>(categories: CategoryRef[], products: T[]): CategoryRef[] {
  const inUse = new Set(products.map((p) => p.categoryId).filter((id): id is string => Boolean(id)));
  return categories.filter((c) => inUse.has(c.id));
}