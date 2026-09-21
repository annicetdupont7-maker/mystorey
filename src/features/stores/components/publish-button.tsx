"use client";
import { useActionState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { publishStoreAction, unpublishStoreAction, type PublishState } from "../actions";

/**
 * "Publier" means publish: the server checks there is something to buy and a number to
 * receive orders, and explains in plain words what is missing instead of failing silently.
 */
export function PublishStoreButton({ storeId, label = "Publier ma boutique", className = "vf-button" }: { storeId: string; label?: string; className?: string }) {
  const [state, action, pending] = useActionState<PublishState, FormData>(publishStoreAction, {});
  return (
    <form action={action} className="publish-form">
      <input type="hidden" name="storeId" value={storeId} />
      <button className={className} disabled={pending}>
        {pending ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Publication…</> : <><Rocket size={16} aria-hidden="true" /> {label}</>}
      </button>
      {state.error && (
        <div className="form-error publish-blockers" role="alert">
          <p>{state.error}</p>
          {state.blockers && <ul>{state.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
        </div>
      )}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
    </form>
  );
}

export function UnpublishStoreButton({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState<PublishState, FormData>(unpublishStoreAction, {});
  return (
    <form action={action} className="publish-form" onSubmit={(event) => { if (!window.confirm("Mettre votre boutique hors ligne ? Vos clientes verront une page d’attente.")) event.preventDefault(); }}>
      <input type="hidden" name="storeId" value={storeId} />
      <button className="text-button text-button--danger" disabled={pending}>{pending ? "Un instant…" : "Mettre ma boutique hors ligne"}</button>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
    </form>
  );
}
