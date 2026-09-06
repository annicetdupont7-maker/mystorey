"use client";
import { useActionState } from "react";
import { resendConfirmation } from "../actions";
export function ResendConfirmation({email}:{email:string}){
  const [state,action,pending]=useActionState(resendConfirmation,{});
  if(state.success)return <p className="form-success" role="status">{state.success}</p>;
  return <form action={action} className="resend-form" aria-label="Renvoyer l’email de confirmation">
    <input type="hidden" name="email" value={email}/>
    {state.error&&<p className="form-error" role="alert">{state.error}</p>}
    <button type="submit" className="text-button link" disabled={pending||!email}>{pending?"Envoi…":"Renvoyer l’email de confirmation"}</button>
  </form>;
}