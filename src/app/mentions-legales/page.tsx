import Link from "next/link";

export const metadata = {
  title: "Mentions légales",
  description: "Mentions légales de NEXORA et de la plateforme MYSTOREY.",
};

export default function LegalPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="card" style={{ maxWidth: 900, margin: "3rem auto", padding: "2rem" }}>
        <p className="vf-eyebrow">NEXORA</p>
        <h1>Mentions légales</h1>
        <p className="muted">NEXORA est la structure qui opère la plateforme MYSTOREY. Les informations ci-dessous sont la version de lancement, à compléter juridiquement selon les formalités locales.</p>

        <div style={{ display: "grid", gap: "1rem", lineHeight: 1.7 }}>
          <section>
            <h2>1. Éditeur</h2>
            <p>NEXORA — Entreprise ou entité éditrice de la plateforme MYSTOREY.</p>
          </section>

          <section>
            <h2>2. Siège social</h2>
            <p>Adresse complète à compléter selon l’immatriculation officielle de NEXORA.</p>
          </section>

          <section>
            <h2>3. Contact</h2>
            <p>Email : annicetdupont7@gmail.com</p>
          </section>

          <section>
            <h2>4. Hébergement</h2>
            <p>Hébergeur technique à compléter selon la configuration finale de production.</p>
          </section>

          <section>
            <h2>5. Responsabilité</h2>
            <p>MYSTOREY fournit une plateforme de gestion pour les boutiques, sans se substituer aux responsabilités commerciales et juridiques de la vendeuse.</p>
          </section>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/" className="text-button">Retour à l’accueil</Link>
        </div>
      </section>
    </main>
  );
}
