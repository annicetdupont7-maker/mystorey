import Link from "next/link";

export const metadata = {
  title: "Contact / Support",
  description: "Contactez le support NEXORA pour toute question sur votre boutique, vos produits ou votre abonnement.",
};

export default function ContactPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="card" style={{ maxWidth: 700, margin: "3rem auto", padding: "2rem" }}>
        <p className="vf-eyebrow">NEXORA</p>
        <h1>Contact / Support</h1>
        <p className="muted">L’équipe NEXORA vous accompagne pour la gestion de votre boutique et de vos abonnements.</p>

        <div style={{ display: "grid", gap: "1rem", lineHeight: 1.7 }}>
          <p><strong>Email :</strong> annicetdupont7@gmail.com</p>
          <p><strong>Entreprise :</strong> NEXORA</p>
          <p><strong>Téléphone :</strong> à compléter</p>
          <p><strong>Horaires :</strong> à compléter</p>
          <p>Pour toute demande liée à votre boutique, la création d’un compte, votre abonnement ou un problème technique, contactez l’équipe NEXORA.</p>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/" className="text-button">Retour à l’accueil</Link>
        </div>
      </section>
    </main>
  );
}
