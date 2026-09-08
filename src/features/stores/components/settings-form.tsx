"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveStoreSettings } from "../actions";
export function SettingsForm({storeId,name,description,whatsapp}:{storeId:string;name:string;description:string;whatsapp:string}){
  const [state,action,pending]=useActionState(saveStoreSettings,{});
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  return <form className="settings-form" action={action}>
    <input type="hidden" name="storeId" value={storeId}/>
    <label className="field"><span>Nom de la boutique</span><input name="name" defaultValue={name} required maxLength={80}/>{state.fieldErrors?.name&&<small>{state.fieldErrors.name[0]}</small>}</label>
    <label className="field"><span>Description</span><textarea name="description" defaultValue={description} rows={3} maxLength={500} placeholder="Petite phrase qui présente votre univers."/>{state.fieldErrors?.description&&<small>{state.fieldErrors.description[0]}</small>}</label>
    <label className="field"><span>Numéro WhatsApp</span><input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" defaultValue={whatsapp} placeholder="+237 6 90 00 00 00"/>{state.fieldErrors?.whatsapp&&<small>{state.fieldErrors.whatsapp[0]}</small>}<small className="field-hint">Format international obligatoire avec + et l’indicatif pays.</small></label>
    {state.success&&<p className="form-success" role="status">{state.success}</p>}
    {state.error&&<p className="form-error" role="alert">{state.error}</p>}
    <div><button className="vf-button" disabled={pending}>{pending?"Enregistrement…":"Enregistrer"}</button></div>
  </form>;
}