import Link from "next/link";

/**
 * A visitor reaches this page for a mistyped link, a deleted shop, or — most often —
 * a shop the seller shared before publishing it: RLS hides an unpublished shop from
 * anonymous visitors, so the storefront cannot tell them apart and used to fall back
 * to the generic "page not found". The seller's client deserves an explanation and a
 * reason to come back.
 */
export default function StoreNotFound() {
  return (
    <main className="store-coming-soon">
      <div className="store-coming-soon-card">
        <span className="store-logo-mark">M</span>
        <h1>Cette boutique n’est pas accessible</h1>
        <p>
          Le lien est peut-être incomplet, ou la vendeuse n’a pas encore publié sa boutique.
          Demandez-lui de vous renvoyer son lien : sa vitrine s’ouvrira dès sa publication.
        </p>
        <Link className="vf-button vf-button--ghost" href="/">
          Découvrir MYSTOREY
        </Link>
      </div>
    </main>
  );
}
