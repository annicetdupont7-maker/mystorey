import type { OrderStatus } from "@/features/orders/order-status";

export type AdminRole = "seller" | "admin";

export type AdminUserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: AdminRole | null;
  roleSet: boolean;
  created_at: string | null;
  banned: boolean;
  active: boolean;
  stores: number;
};

export type AdminStoreRow = {
  id: string;
  owner_id: string;
  ownerName: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  created_at: string;
  whatsapp: string;
  products: number;
  orders: number;
};

export type AdminProductRow = {
  id: string;
  store_id: string;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  name: string;
  note: string;
  price: number;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  image_url: string | null;
};

export type AdminOrderRow = {
  id: string;
  store_id: string;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  status: OrderStatus;
  note: string;
  created_at: string;
  items: { productId: string; name: string; unitPrice: number; quantity: number }[];
};

export type AdminStats = {
  users: number;
  sellers: number;
  admins: number;
  stores: number;
  storesPublished: number;
  storesDraft: number;
  products: number;
  orders: number;
  ordersPending: number;
  revenue: number;
};

export type ActivityKind = "user" | "store" | "order";
export type ActivityItem = { id: string; kind: ActivityKind; title: string; detail: string; date: string };