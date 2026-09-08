"use client";
import { useActionState } from "react";
import { deleteStore } from "../actions";
export function DeleteStoreForm({storeId}:{storeId:string}){
  const [state,action,pending]=useActionState(deleteStore,{});
  return <section className="danger-zone">
    <div><p className="vf-eyebrow">Zone sensible</p><h2>Supprimer la boutique</h2><p className="muted">Cette action supprime définitivement la boutique, ses produits, ses commandes et ses réglages. Votre compte restera accessible.</p></div>
    <form action={action} onSubmit={(event)=>{if(!window.confirm("Supprimer définitivement cette boutique et toutes ses données ?"))event.preventDefault();}}>
      <input type="hidden" name="storeId" value={storeId}/>
      <label className="field"><span>Tapez SUPPRIMER pour confirmer</span><input name="confirmation" required pattern="SUPPRIMER" autoComplete="off" /></label>
      {state.error&&<p className="form-error" role="alert">{state.error}</p>}
      <button type="submit" className="vf-button vf-button--danger" disabled={pending}>{pending?"Suppression…":"Supprimer définitivement"}</button>
    </form>
  </section>;
}