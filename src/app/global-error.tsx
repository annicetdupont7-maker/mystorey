"use client";

/**
 * Le dernier filet : une erreur qui remonte jusqu'au layout racine. Ce fichier
 * remplace tout le document, donc il ne reçoit NI globals.css NI les polices —
 * tout est en style inline, volontairement.
 *
 * Écrit pour une vendeuse : pas de « Something went wrong », pas de code
 * d'erreur seul. Un bouton qui recharge vraiment, et le numéro à nous donner si
 * ça recommence (le digest, qui correspond à la ligne [mystorey-error] des logs).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem 1rem", background: "#faf7f5", color: "#2b1d22", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <title>Une erreur est survenue | MYSTOREY</title>
        <main style={{ maxWidth: 440, textAlign: "center" }}>
          <p style={{ margin: "0 0 .5rem", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", opacity: .6 }}>MYSTOREY</p>
          <h1 style={{ margin: "0 0 .6rem", fontSize: 24 }}>Cette page n’a pas pu s’afficher</h1>
          <p style={{ margin: "0 0 1.4rem", lineHeight: 1.6, opacity: .8 }}>
            Rien n’est perdu : votre boutique, vos produits et vos commandes sont intacts. Réessayez, c’est souvent passager.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: "#4f1d2d", color: "#fff", border: 0, borderRadius: 999, padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
          <p style={{ margin: "1.2rem 0 0" }}>
            <a href="/dashboard" style={{ color: "#4f1d2d", fontSize: 14 }}>Retour à mon espace</a>
          </p>
          {error.digest && (
            <p style={{ margin: "1.6rem 0 0", fontSize: 12, opacity: .55 }}>
              Si cela recommence, donnez-nous ce numéro : <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
