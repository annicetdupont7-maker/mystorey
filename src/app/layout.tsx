import type { Metadata, Viewport } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://mystorey.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "MYSTOREY — Votre boutique, votre histoire",
    template: "%s | MYSTOREY",
  },
  description:
    "MYSTOREY aide les vendeuses à créer leur boutique, gérer leurs produits et commandes, relancer leurs clientes et développer leur activité simplement.",
  applicationName: "MYSTOREY",
  creator: "MYSTOREY",
  publisher: "MYSTOREY",
  icons: {
    icon: [{ url: "/favicon.png?v=2", type: "image/png", sizes: "520x520" }],
    shortcut: [{ url: "/favicon.png?v=2", type: "image/png", sizes: "520x520" }],
    apple: "/logo.png",
  },
  keywords: [
    "boutique en ligne",
    "commerce bénin",
    "vendeuse",
    "boutique africaine",
    "WhatsApp commerce",
    "MYSTOREY",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MYSTOREY — Votre boutique, votre histoire",
    description:
      "Créez votre vitrine, gérez vos produits et vos commandes, et développez votre boutique depuis votre téléphone.",
    url: appUrl,
    siteName: "MYSTOREY",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/logo.png", width: 1262, height: 1262, alt: "Logo MYSTOREY" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MYSTOREY",
    description:
      "Créez votre boutique, recevez vos commandes et relancez vos clientes simplement.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f1d2d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
