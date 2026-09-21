import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";
import { getMyFeedback } from "@/features/feedback/data";
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, SUPPORT_EMAIL } from "@/features/feedback/schemas";

export const dynamic = "force-dynamic";

const QUESTIONS = [
  { q: "Comment ajouter plusieurs couleurs ou tailles ?", a: "Créez le produit une seule fois, puis ouvrez-le depuis « Produits » : la section « Couleurs, tailles… » permet d’ajouter chaque choix avec sa photo et son stock.", href: "/dashboard/products" },
  { q: "Ma cliente dit que la boutique est « pas accessible »", a: "Votre boutique n’est sans doute pas encore publiée. Sur l’accueil, suivez la liste « Lancer ma boutique » jusqu’à « Boutique publiée ».", href: "/dashboard" },
  { q: "Où arrivent les commandes ?", a: "Chaque commande apparaît dans « Commandes » et votre cliente vous envoie le récapitulatif sur WhatsApp. Confirmez-la avec elle, puis faites avancer son statut.", href: "/dashboard/orders" },
  { q: "Comment changer les couleurs de ma boutique ?", a: "Dans « Boutique » (Apparence), touchez un thème : l’aperçu change tout de suite. Enregistrez pour l’appliquer.", href: "/dashboard/storefront/appearance" },
];

export default async function HelpPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");
  const [{ data: profile }, feedback] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getMyFeedback(supabase, user.id),
  ]);

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Aide &amp; suggestions</p>
          <h1>On est là pour vous aider.</h1>
          <p className="muted">Un souci, une question, une idée pour améliorer MYSTOREY ? Écrivez-nous : chaque message est lu par l’équipe.</p>
        </div>
      </section>

      <div className="help-layout">
        <FeedbackForm defaultContact={store.whatsapp ?? user.email ?? ""} />

        <section className="panel help-faq" aria-labelledby="help-faq-title">
          <h2 id="help-faq-title">Questions fréquentes</h2>
          {QUESTIONS.map((item) => (
            <details key={item.q} className="help-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
              <Link className="text-button" href={item.href}>Y aller</Link>
            </details>
          ))}
          <p className="muted help-fallback">Vous pouvez aussi écrire à <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        </section>
      </div>

      {feedback.rows.length > 0 && (
        <section className="panel" aria-labelledby="my-feedback-title">
          <h2 id="my-feedback-title">Mes messages</h2>
          <ul className="feedback-history">
            {feedback.rows.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{FEEDBACK_KIND_LABELS[row.kind]}</strong>
                  <p>{row.message}</p>
                  {row.admin_note && <p className="feedback-reply"><strong>Réponse de l’équipe :</strong> {row.admin_note}</p>}
                </div>
                <span className={`tag feedback-status feedback-status--${row.status}`}>{FEEDBACK_STATUS_LABELS[row.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </DashboardShell>
  );
}
