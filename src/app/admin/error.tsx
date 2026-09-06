"use client";
import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state admin-error">
      <p className="vf-eyebrow">Supervision</p>
      <h2>Une erreur est survenue.</h2>
      <p>Ces données ne sont pas disponibles pour le moment. Vérifiez la connexion puis réessayez.</p>
      <div className="admin-error-actions">
        <button className="vf-button vf-button--ghost" type="button" onClick={reset}>Réessayer</button>
        <Link className="text-button" href="/admin">Retour au dashboard</Link>
      </div>
    </section>
  );
}