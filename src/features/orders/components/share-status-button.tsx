"use client";
import { MessageCircle } from "lucide-react";
import { buildStatusNoticeMessage } from "../messages";
import { buildWhatsAppLink } from "@/features/storefront/whatsapp";
import type { OrderStatus } from "../order-status";

export function ShareStatusButton({ orderNumber, status, customerName, customerPhone }: { orderNumber: string; status: OrderStatus; customerName: string; customerPhone: string }) {
  const link = buildWhatsAppLink(customerPhone, buildStatusNoticeMessage(orderNumber, status, customerName));
  if (!link) return null;
  return <a className="text-button" href={link} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" /> Prévenir le client</a>;
}