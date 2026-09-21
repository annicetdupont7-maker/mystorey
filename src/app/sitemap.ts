import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { appUrl } from "@/lib/app-url";

export const revalidate = 3600;

/** The landing, the legal pages and every published shop (RLS only returns those). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/conditions-utilisation`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/politique-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return pages;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase.from("stores").select("slug,updated_at").eq("status", "published").limit(5000);
    return [...pages, ...(data ?? []).map((store) => ({ url: `${base}/store/${store.slug}`, lastModified: store.updated_at, changeFrequency: "daily" as const, priority: 0.7 }))];
  } catch {
    return pages;
  }
}
