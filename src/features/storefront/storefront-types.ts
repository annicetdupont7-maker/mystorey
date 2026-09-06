export type ProductRow = { id: string; name: string; note: string | null; price: number; image_url: string | null; is_featured?: boolean; is_available?: boolean; category_id?: string | null };
export type ProductView = { id: string; name: string; price: string; note: string; image: string | null; unitPrice: number; featured: boolean; available: boolean; categoryId: string | null };
const fcf = new Intl.NumberFormat("fr-FR");
export function formatPrice(value: number): string { return `${fcf.format(value)} FCFA`; }
export function toProductView(row: ProductRow): ProductView { return { id: row.id, name: row.name, price: formatPrice(row.price), note: row.note ?? "", image: row.image_url, unitPrice: row.price, featured: Boolean(row.is_featured), available: row.is_available ?? true, categoryId: row.category_id ?? null }; }
export const demoProducts: ProductView[] = [
  { id: "1", name: "Escarpins Éclat", price: "28 000 FCFA", note: "Pièce signature", image: "/images/Image_products/WhatsApp%20Image%202026-09-02%20at%2016.14.45.jpeg", unitPrice: 28000, featured: true, available: true, categoryId: null },
  { id: "2", name: "Sandales Bijoux", price: "19 500 FCFA", note: "Disponible maintenant", image: "/images/Image_products/WhatsApp%20Image%202026-09-02%20at%2016.14.46.jpeg", unitPrice: 19500, featured: false, available: true, categoryId: null },
  { id: "3", name: "Sac Bordeaux", price: "35 000 FCFA", note: "Édition limitée", image: "/images/Image_products/WhatsApp%20Image%202026-09-02%20at%2016.26.51.jpeg", unitPrice: 35000, featured: false, available: true, categoryId: null },
  { id: "4", name: "Sac Ivoire", price: "16 000 FCFA", note: "Finition délicate", image: "/images/Image_products/WhatsApp%20Image%202026-09-02%20at%2016.26.52.jpeg", unitPrice: 16000, featured: false, available: true, categoryId: null }
];