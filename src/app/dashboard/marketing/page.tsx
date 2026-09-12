import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyFirstStore } from "@/features/stores/data";
import { getOrders } from "@/features/orders/data";
import { getProducts } from "@/features/products/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { StoreShareSheet } from "@/features/sharing/components/share-sheet";
import { Storefront } from "@/features/storefront/components";
import { formatPrice, toProductView } from "@/features/storefront/storefront-types";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import { allowCustomerReengagement, optOutCustomerReengagement, recordReengagement } from "@/features/marketing/actions";
import { buildReengagementMessage, isInactiveCustomer, isPendingOrder, whatsappUrl } from "@/features/marketing/relances";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");
  const [productsResult, profileResult, ordersResult, contactsResult, logsResult] = await Promise.all([
    getProducts(),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getOrders(),
    supabase.from("customer_contacts").select("phone,name,marketing_consent,opted_out").eq("store_id", store.id),
    supabase.from("reengagement_logs").select("customer_phone,created_at,status,kind").eq("store_id", store.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const { data: profile } = profileResult;
  const contacts = new Map((contactsResult.data ?? []).map((contact) => [contact.phone, contact]));
  const recentPhones = new Set((logsResult.data ?? []).map((log) => log.customer_phone));
  const latestByPhone = new Map<string, NonNullable<typeof ordersResult>["orders"][number]>();
  for (const order of ordersResult?.orders ?? []) {
    if (!order.customer_phone || order.status === "cancelled") continue;
    if (!latestByPhone.has(order.customer_phone)) latestByPhone.set(order.customer_phone, order);
  }
  const candidates = [...latestByPhone.values()].flatMap((order) => {
    const kind = isPendingOrder(order.status) ? "pending_order" as const : isInactiveCustomer(order.created_at) ? "inactive_customer" as const : null;
    if (!kind) return [];
    const contact = contacts.get(order.customer_phone);
    const candidate = { phone: order.customer_phone, name: contact?.name || order.customer_name, orderId: order.id, orderNumber: order.order_number, kind, lastOrderAt: order.created_at, lastOrderTotal: order.total, orderStatus: order.status, consent: contact?.marketing_consent ?? false, optedOut: contact?.opted_out ?? false, recentlyContacted: recentPhones.has(order.customer_phone) };
    const message = buildReengagementMessage(candidate);
    return [{ ...candidate, message, url: whatsappUrl(candidate.phone, message) }];
  });
  const publicUrl = `/store/${store.slug}`;
  const theme = Array.isArray(store.store_themes) ? store.store_themes[0] : store.store_themes;
  const { tokens } = resolveStoreTheme(theme ?? { preset_id: "modern", version: 1 });
  const products = (productsResult?.products ?? []).filter((product) => product.is_available).map(toProductView);

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head"><div><p className="vf-eyebrow">Développer</p><h1>Partagez, puis relancez avec tact.</h1><p className="muted">Ouvrez WhatsApp avec un message préparé à partir de vos vraies commandes. Aucun message n’est envoyé automatiquement.</p></div></section>
      <section className="marketing-layout">
        <div className="panel"><p className="vf-eyebrow">Lien public</p><h2>{store.name}</h2><p className="muted">{publicUrl}</p><StoreShareSheet storeName={store.name} storeSlug={store.slug} /></div>
        <div className="panel"><p className="vf-eyebrow">Présence</p><h2>{store.status === "published" ? "Votre boutique est en ligne" : "Votre boutique est en brouillon"}</h2><p className="muted">{store.status === "published" ? "Vos clientes peuvent découvrir vos produits via ce lien." : "Publiez votre boutique depuis Apparence avant de la partager."}</p></div>
      </section>
      <section className="panel reengagement-panel" aria-labelledby="reengagement-title">
        <div className="panel-head"><div><p className="vf-eyebrow">Relances intelligentes</p><h2 id="reengagement-title">Des rappels humains, jamais du spam.</h2></div><span className="tag">{candidates.length} à examiner</span></div>
        <p className="muted">Les commandes non confirmées et les clientes inactives apparaissent ici. Activez les relances uniquement lorsque la cliente vous a donné son accord.</p>
        {candidates.length === 0 ? <div className="empty-state"><h3>Aucune relance à traiter</h3><p>Les commandes en attente et les clientes sans achat depuis 30 jours apparaîtront avec un numéro de téléphone.</p></div> : <div className="reengagement-list">
          {candidates.map((candidate) => <article className="reengagement-row" key={`${candidate.kind}-${candidate.phone}`}>
            <div><strong>{candidate.name || "Cliente"}</strong><small>{candidate.phone} · {candidate.kind === "pending_order" ? "Commande à confirmer" : "Inactive depuis 30 jours"} · dernière commande {formatPrice(candidate.lastOrderTotal)}</small></div>
            <div className="reengagement-actions">
              {candidate.consent && !candidate.optedOut && !candidate.recentlyContacted ? <>
                <a className="vf-button vf-button--ghost vf-button--sm" href={candidate.url} target="_blank" rel="noreferrer">Ouvrir WhatsApp</a>
                <form action={recordReengagement}><input type="hidden" name="phone" value={candidate.phone} /><input type="hidden" name="orderId" value={candidate.orderId} /><input type="hidden" name="kind" value={candidate.kind} /><input type="hidden" name="message" value={candidate.message} /><button className="vf-button vf-button--sm" type="submit">Marquer relancée</button></form>
                <form action={optOutCustomerReengagement}><input type="hidden" name="phone" value={candidate.phone} /><button className="text-button" type="submit">Ne plus relancer</button></form>
              </> : candidate.recentlyContacted ? <span className="muted">Relancée récemment</span> : candidate.optedOut ? <span className="muted">Désinscrite</span> : <form action={allowCustomerReengagement}><input type="hidden" name="phone" value={candidate.phone} /><input type="hidden" name="name" value={candidate.name} /><button className="vf-button vf-button--sm" type="submit">Autoriser les relances</button></form>}
            </div>
          </article>)}
        </div>}
        {(logsResult.data ?? []).length > 0 && <details className="reengagement-history"><summary>Voir l’historique récent</summary><ul>{(logsResult.data ?? []).slice(0, 10).map((log) => <li key={`${log.customer_phone}-${log.created_at}`}>{log.customer_phone} · {log.kind === "pending_order" ? "commande à confirmer" : "cliente inactive"} · {log.status} · {new Date(log.created_at).toLocaleDateString("fr-FR")}</li>)}</ul></details>}
      </section>
      <section className="marketing-preview" aria-label="Aperçu de la boutique à partager"><div className="panel-head"><div><p className="vf-eyebrow">Aperçu</p><h2>Votre vitrine telle qu&apos;elle sera partagée</h2></div><Link href="/dashboard/storefront/identity" className="text-button">Personnaliser</Link></div><div className="marketing-preview-frame" style={themeCssVariables(tokens)}><Storefront tokens={tokens} products={products} storeName={store.name} slogan={store.slogan ?? undefined} description={store.description ?? undefined} logoUrl={store.logo_url ?? undefined} coverUrl={store.cover_url ?? undefined} slug={store.slug} whatsapp={store.whatsapp ?? undefined} disableCheckout /></div></section>
    </DashboardShell>
  );
}
