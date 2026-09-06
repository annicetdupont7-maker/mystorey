import type { OrderOverview } from "@/features/orders/overview";
import type { OrderRow } from "@/features/orders/types";

export type ProductForInsight = {
  id: string;
  name: string;
  note: string;
  description: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
};

export type InsightContext = {
  storePublished: boolean;
  whatsappSet: boolean;
  products: ProductForInsight[];
  orders: OrderRow[];
  overview: OrderOverview;
};

export type InsightTone = "highlight" | "warning" | "positive" | "opportunity" | "quiet";
export type Insight = { id: string; tone: InsightTone; title: string; body: string; href?: string; cta?: string };

export type Todo = { id: string; label: string; detail: string; href: string; cta: string; urgent?: boolean };

export type FeaturedSuggestion = { product: ProductForInsight; reason: string } | null;