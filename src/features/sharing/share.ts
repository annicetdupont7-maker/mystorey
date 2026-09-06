export type SharePayload = {
  title: string;
  price: number;
  productId: string;
  storeSlug: string;
  baseUrl: string;
};

export function productShareUrl(payload: SharePayload): string {
  return `${payload.baseUrl}/store/${payload.storeSlug}/produit/${payload.productId}`;
}

export function storeShareUrl(storeSlug: string, baseUrl: string): string {
  return `${baseUrl}/store/${storeSlug}`;
}

const pricePlain = (value: number) => new Intl.NumberFormat("fr-FR").format(value).replace(/[\u202F\u00A0]/g, " ");

export function buildShareMessages(payload: SharePayload): { whatsapp: string; facebook: string; instagram: string } {
  const url = productShareUrl(payload);
  const text = `${payload.title} — ${pricePlain(payload.price)} F CFA\n\n${url}`;
  return {
    whatsapp: `Bonjour 👋\n\nDécouvrez notre ${payload.title} à ${pricePlain(payload.price)} F CFA :\n\n${url}`,
    facebook: text,
    instagram: text,
  };
}

export function buildStoreShareMessages(storeName: string, storeSlug: string, baseUrl: string): { whatsapp: string; facebook: string; instagram: string } {
  const url = storeShareUrl(storeSlug, baseUrl);
  const text = `Ma boutique ${storeName} en ligne :\n\n${url}`;
  return {
    whatsapp: `Bonjour 👋\n\nDécouvrez notre boutique ${storeName} :\n\n${url}`,
    facebook: text,
    instagram: text,
  };
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function qrCodeUrl(url: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&bgcolor=ffffff&color=202635&data=${encodeURIComponent(url)}`;
}