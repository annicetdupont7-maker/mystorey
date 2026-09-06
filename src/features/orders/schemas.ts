import { z } from "zod";
import { ORDER_STATUSES, type OrderStatus } from "./order-status";

export type OrderItemSnapshot = { productId: string; name: string; unitPrice: number; quantity: number };

export const orderLineSchema = z.object({
  productId: z.string().min(1, "Produit requis."),
  quantity: z.coerce.number().int().min(1, "Quantité au moins 1.").max(999, "Quantité trop élevée."),
});

export const orderFormSchema = z.object({
  customerName: z.string().trim().min(1, "Le nom du client est requis.").max(120, "120 caractères maximum."),
  customerPhone: z.string().trim().max(40, "40 caractères maximum.").optional().default(""),
  customerAddress: z.string().trim().max(250, "250 caractères maximum.").optional().default(""),
  note: z.string().trim().max(500, "500 caractères maximum.").optional().default(""),
  lines: z.array(orderLineSchema).min(1, "Ajoutez au moins un produit."),
});

export type OrderFormInput = z.infer<typeof orderFormSchema>;

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function computeOrderTotal(items: OrderItemSnapshot[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export type OrderActionState = { error?: string; success?: string; fieldErrors?: Record<string, string[]> };