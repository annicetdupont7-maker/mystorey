import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { StoreShareSheet } from "@/features/sharing/components/share-sheet";
import { CopyLinkButton } from "@/features/sharing/components/copy-link-button";
import { PublishStoreButton } from "./publish-button";
import { isLaunchReady, nextLaunchStep, type LaunchStep } from "../launch";

/**
 * The seller's map: where she is, what is done, what comes next — and, at the end,
 * her link. It replaces a static "presque prête" banner whose steps never ticked.
 */
export function LaunchChecklist({ steps, storeId, storeName, storeSlug, publicUrl, welcome }: { steps: LaunchStep[]; storeId: string; storeName: string; storeSlug: string; publicUrl: string; welcome?: boolean }) {
  const ready = isLaunchReady(steps);
  const next = nextLaunchStep(steps);
  const doneCount = steps.filter((step) => step.done).length;

  if (ready) {
    return (
      <section className="launch-ready" aria-labelledby="launch-ready-title">
        <div className="launch-ready-copy">
          <p className="vf-eyebrow">Tout est prêt</p>
          <h2 id="launch-ready-title">Votre boutique est prête 🎉</h2>
          <p>Partagez ce lien dans vos statuts WhatsApp, votre bio Instagram ou TikTok : vos clientes voient vos produits et vous envoient leur commande.</p>
          <p className="launch-url"><span>{publicUrl.replace(/^https?:\/\//, "")}</span></p>
        </div>
        <div className="launch-ready-actions">
          <StoreShareSheet storeName={storeName} storeSlug={storeSlug} published />
          <CopyLinkButton url={publicUrl} />
          <Link className="vf-button vf-button--ghost" href={`/store/${storeSlug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" /> Voir ma boutique</Link>
        </div>
      </section>
    );
  }

  const canPublish = steps.find((step) => step.id === "whatsapp")?.done && steps.find((step) => step.id === "product_published")?.done;

  return (
    <section className="launch-checklist" aria-labelledby="launch-title">
      <div className="launch-head">
        <div>
          <p className="vf-eyebrow">{welcome ? "Bienvenue ! Votre boutique est créée" : "Lancer ma boutique"}</p>
          <h2 id="launch-title">{next ? `Prochaine étape : ${next.todo.charAt(0).toLowerCase()}${next.todo.slice(1)}` : "Presque terminé"}</h2>
          <p className="muted">{doneCount} étape{doneCount > 1 ? "s" : ""} sur {steps.length} terminée{doneCount > 1 ? "s" : ""}. Suivez la liste, on s’occupe du reste.</p>
        </div>
        <span className="launch-progress" role="img" aria-label={`${doneCount} sur ${steps.length}`}>
          <span style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
        </span>
      </div>
      <ol className="launch-steps">
        {steps.map((step) => {
          const isNext = next?.id === step.id;
          return (
            <li key={step.id} className={`launch-step${step.done ? " is-done" : ""}${isNext ? " is-next" : ""}`}>
              <span className="launch-step-mark" aria-hidden="true">{step.done ? <Check size={14} /> : null}</span>
              <div className="launch-step-body">
                <strong>{step.label}<span className="visually-hidden">{step.done ? " — terminé" : " — à faire"}</span></strong>
                {!step.done && step.hint && <small>{step.hint}</small>}
              </div>
              {/* One button at a time: only the step to do now carries an action. */}
              {!step.done && step.id === "store_published" && (isNext || canPublish) && (
                canPublish
                  ? <PublishStoreButton storeId={storeId} className="vf-button vf-button--sm" />
                  : <span className="launch-step-wait">Après les étapes ci-dessus</span>
              )}
              {isNext && step.cta && (
                <Link className="vf-button vf-button--sm" href={step.cta.href}>
                  {step.cta.label} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
