import type { OrderItemSnapshot } from "./schemas";
import type { OrderStatus } from "./order-status";

export type OrderRow = {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: OrderItemSnapshot[];
  total: number;
  status: OrderStatus;
  note: string;
  created_at: string;
  updated_at: string;
};

export type ProductOrderStats = { productId: string; orders: number; quantity: number; revenue: number };