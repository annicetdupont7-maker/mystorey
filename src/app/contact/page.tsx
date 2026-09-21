import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/features/feedback/schemas";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l’équipe MYSTOREY pour toute question sur votre boutique, vos produits ou votre compte.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="card contact-card">
        <p className="vf-eyebrow">MYSTOREY</p>
        <h1>Nous contacter</h1>
        <p className="muted">Une question sur votre boutique, un souci pour ajouter un produit, une idée ? L’équipe vous répond.</p>

        <div className="contact-options">
          <div className="contact-option">
            <strong>Vous avez déjà une boutique</strong>
            <p>Le plus rapide : écrivez-nous depuis votre espace, rubrique <em>Aide &amp; suggestions</em>. Nous voyons tout de suite de quelle boutique il s’agit.</p>
            <Link className="vf-button" href="/dashboard/help">Écrire depuis mon espace</Link>
          </div>
          <div className="contact-option">
            <strong>Par email</strong>
            <p>Pour toute autre demande (partenariat, presse, données personnelles).</p>
            <a className="vf-button vf-button--ghost" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </div>
        </div>

        <p className="muted contact-legal">MYSTOREY est une plateforme opérée par NEXORA.</p>
        <Link href="/" className="text-button">← Retour à l’accueil</Link>
      </section>
    </main>
  );
}
