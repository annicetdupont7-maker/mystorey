import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité",
  description: "Comment NEXORA collecte, utilise et protège les données de ses vendeuses et clientes.",
};

export default function PrivacyPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="card" style={{ maxWidth: 900, margin: "3rem auto", padding: "2rem" }}>
        <p className="vf-eyebrow">NEXORA</p>
        <h1>Politique de confidentialité</h1>
        <p className="muted">NEXORA traite les données de ses vendeuses et clientes conformément aux exigences de sécurité et de confidentialité applicables.</p>

        <div style={{ display: "grid", gap: "1rem", lineHeight: 1.7 }}>
          <section>
            <h2>1. Données collectées</h2>
            <p>NEXORA collecte les informations nécessaires à la création du compte, à la gestion de la boutique, au traitement des commandes et au service client. Cela inclut notamment le nom, l’adresse e-mail, le numéro de téléphone, le nom de la boutique, les produits et les informations de commande.</p>
          </section>

          <section>
            <h2>2. Utilisation des données</h2>
            <p>Les données sont utilisées pour fournir le service, gérer la boutique, confirmer les commandes, traiter les abonnements, sécuriser l’accès et améliorer la qualité de l’expérience.</p>
          </section>

          <section>
            <h2>3. Partage des données</h2>
            <p>Les données ne sont pas vendues à des tiers. Elles peuvent être partagées uniquement avec les prestataires techniques nécessaires au bon fonctionnement du service (hébergement, base de données, paiement, stockage de fichiers, support technique), dans le respect de la sécurité.</p>
          </section>

          <section>
            <h2>4. Sécurité</h2>
            <p>NEXORA met en œuvre des mesures de sécurité raisonnables pour protéger les données personnelles contre les accès non autorisés, les pertes ou les modifications.</p>
          </section>

          <section>
            <h2>5. Droits des utilisateurs</h2>
            <p>Vous pouvez demander à accéder, corriger ou supprimer les données associées à votre compte, conformément à la réglementation applicable.</p>
          </section>

          <section>
            <h2>6. Contact</h2>
            <p>Pour toute demande relative à vos données, contactez NEXORA à l’adresse annicetdupont7@gmail.com.</p>
          </section>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/" className="text-button">Retour à l’accueil</Link>
        </div>
      </section>
    </main>
  );
}
