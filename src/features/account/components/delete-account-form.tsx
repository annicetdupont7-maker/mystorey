"use client";
import { useActionState, useState } from "react";
import { deleteAccount } from "../actions";
import { DELETION_PHRASE } from "../deletion";

/**
 * Le dernier geste possible dans MYSTOREY. Replié par défaut : il n'a rien à faire
 * grand ouvert sous les yeux d'une vendeuse qui cherchait ses réglages.
 */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, {});
  const [open, setOpen] = useState(false);
  return <section className="danger-zone">
    <div>
      <p className="vf-eyebrow">Zone sensible</p>
      <h2>Supprimer mon compte</h2>
      <p className="muted">Cette action est définitive. Votre compte, vos boutiques, vos produits, vos photos et vos commandes sont supprimés, et vous ne pourrez plus vous reconnecter avec cette adresse. L’historique de vos ventes est conservé sans aucune donnée de vos clientes, pour la seule comptabilité de MYSTOREY. Un abonnement en cours est perdu, sans remboursement.</p>
    </div>
    {open
      ? <form action={action} onSubmit={(event) => { if (!window.confirm("Supprimer définitivement votre compte MYSTOREY ? Cette action est irréversible.")) event.preventDefault(); }}>
          <label className="field"><span>Tapez {DELETION_PHRASE} pour confirmer</span><input name="confirmation" required autoComplete="off" /></label>
          <label className="field"><span>Votre mot de passe</span><input name="password" type="password" required autoComplete="current-password" /></label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button type="submit" className="vf-button vf-button--danger" disabled={pending}>{pending ? "Suppression…" : "Supprimer définitivement mon compte"}</button>
        </form>
      : <button type="button" className="vf-button vf-button--ghost" onClick={() => setOpen(true)}>Je veux supprimer mon compte</button>}
  </section>;
}
