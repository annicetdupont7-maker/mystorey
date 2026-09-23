"use client";
import Link from "next/link";

/**
 * L'espace vendeuse a sa propre barrière : sans elle, la moindre coupure de
 * Supabase pendant le chargement du tableau de bord remplaçait toute la page
 * par l'écran d'erreur racine, ce qui donne l'impression que la boutique a
 * disparu. `retry()` relance vraiment la récupération des données.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="page-shell">
      <section className="empty-state">
        <p className="vf-eyebrow">Mon espace</p>
        <h2>Vos données n’ont pas pu être chargées</h2>
        <p>Votre boutique, vos produits et vos commandes sont intacts. C’est l’affichage qui a échoué — réessayez.</p>
        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}>
          <button className="vf-button" type="button" onClick={() => retry()}>Réessayer</button>
          <Link className="text-button" href="/dashboard/help">Demander de l’aide</Link>
        </div>
        {error.digest && <p className="muted" style={{ marginTop: "1.2rem", fontSize: ".76rem" }}>Numéro à nous communiquer : <code>{error.digest}</code></p>}
      </section>
    </main>
  );
}
