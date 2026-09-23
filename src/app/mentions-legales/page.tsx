import Link from "next/link";
import { SUPPORT_EMAIL } from "@/features/feedback/schemas";
import { LEGAL_ENTITY, PROCESSORS } from "@/features/legal/entity";

export const metadata = {
  title: "Mentions légales",
  description: "Mentions légales de NEXORA et de la plateforme MYSTOREY.",
};

/** Une ligne « Libellé : valeur », omise tant que la valeur n'est pas renseignée. */
function Line({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return <p><strong>{label}</strong> : {value}</p>;
}

export default function LegalPage() {
  const { name, legalForm, address, registration, taxId, publicationDirector } = LEGAL_ENTITY;
  return (
    <main className="page-shell auth-shell">
      <section className="card" style={{ maxWidth: 900, margin: "3rem auto", padding: "2rem" }}>
        <p className="vf-eyebrow">{name}</p>
        <h1>Mentions légales</h1>
        <p className="muted">{name} est la structure qui édite et exploite la plateforme MYSTOREY.</p>

        <div style={{ display: "grid", gap: "1rem", lineHeight: 1.7 }}>
          <section>
            <h2>1. Éditeur du site</h2>
            <Line label="Dénomination" value={name} />
            <Line label="Forme juridique" value={legalForm} />
            <Line label="Immatriculation" value={registration} />
            <Line label="Identifiant fiscal" value={taxId} />
            <Line label="Responsable de la publication" value={publicationDirector} />
          </section>

          <section>
            <h2>2. Siège social</h2>
            {address.trim() ? <p>{address}</p> : <p>L’adresse postale est communiquée sur demande à {SUPPORT_EMAIL}.</p>}
          </section>

          <section>
            <h2>3. Contact</h2>
            <p>Toute question, réclamation ou demande relative au service se traite par email : {SUPPORT_EMAIL}. Une réponse est apportée sous 48 heures ouvrées.</p>
          </section>

          <section>
            <h2>4. Hébergement et traitement des données</h2>
            <p>MYSTOREY ne détient pas ses propres serveurs. Le site et les données sont hébergés par :</p>
            <ul>
              {PROCESSORS.map((processor) => (
                <li key={processor.name}>
                  <strong>{processor.name}</strong> — {processor.role}. Données hébergées en {processor.location}.{" "}
                  <a href={processor.site} target="_blank" rel="noopener noreferrer">{processor.site.replace("https://", "")}</a>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>5. Propriété intellectuelle</h2>
            <p>La marque MYSTOREY, le site et ses composants sont la propriété de {name}. Les photos, textes et prix publiés dans une boutique restent la propriété de la vendeuse qui les a mis en ligne.</p>
          </section>

          <section>
            <h2>6. Responsabilité</h2>
            <p>MYSTOREY fournit un outil de gestion. Chaque vendeuse reste seule responsable de ses produits, de ses prix, de ses livraisons et du respect des obligations légales de son activité. {name} n’est pas partie au contrat de vente conclu entre une vendeuse et sa cliente.</p>
          </section>

          <section>
            <h2>7. Données personnelles</h2>
            <p>Le détail des données collectées, de leur usage et de vos droits figure dans la <Link href="/politique-confidentialite">politique de confidentialité</Link>. Les règles d’usage du service figurent dans les <Link href="/conditions-utilisation">conditions d’utilisation</Link>.</p>
          </section>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/" className="text-button">Retour à l’accueil</Link>
        </div>
      </section>
    </main>
  );
}
