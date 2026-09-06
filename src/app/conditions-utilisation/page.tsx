import Link from "next/link";

export const metadata = {
  title: "Conditions d’utilisation",
  description: "Conditions générales d’utilisation de la plateforme NEXORA / MYSTOREY.",
};

export default function TermsPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="card" style={{ maxWidth: 900, margin: "3rem auto", padding: "2rem" }}>
        <p className="vf-eyebrow">NEXORA</p>
        <h1>Conditions d’utilisation</h1>
        <p className="muted">NEXORA met à disposition la plateforme MYSTOREY pour permettre à une vendeuse de créer une boutique, présenter ses produits et gérer ses commandes.</p>

        <div style={{ display: "grid", gap: "1rem", lineHeight: 1.7 }}>
          <section>
            <h2>1. Objet</h2>
            <p>MYSTOREY permet à une vendeuse de créer une boutique, présenter ses produits, gérer ses commandes et développer son activité via des outils simples et centralisés.</p>
          </section>

          <section>
            <h2>2. Utilisation du service</h2>
            <p>L’utilisateur s’engage à utiliser MYSTOREY conformément à la loi et à une utilisation honnête, sans tenter de nuire à la plateforme, à d’autres vendeuses ou à la sécurité du service.</p>
          </section>

          <section>
            <h2>3. Abonnements</h2>
            <p>Les plans gratuits, Plus et Pro sont soumis aux conditions de paiement et aux limites de produits définies sur la plateforme. Un abonnement payant n’est activé qu’après validation d’un paiement conforme.</p>
          </section>

          <section>
            <h2>4. Commandes et ventes</h2>
            <p>La vendeuse est responsable de la description, de la disponibilité et du prix de ses produits. MYSTOREY sert de support de gestion et de communication, sans être responsable des litiges commerciaux entre vendeuse et client.</p>
          </section>

          <section>
            <h2>5. Support et responsabilité</h2>
            <p>NEXORA met à disposition une plateforme de gestion, mais le service ne remplace pas la responsabilité commerciale de la vendeuse ni les obligations légales applicables à son activité.</p>
          </section>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/" className="text-button">Retour à l’accueil</Link>
        </div>
      </section>
    </main>
  );
}
