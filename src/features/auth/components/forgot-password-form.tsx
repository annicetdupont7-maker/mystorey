"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
export function ForgotPasswordForm(){
  const [state,action,pending]=useActionState(requestPasswordReset,{});
  return <form className="auth-form" action={action}><div className="auth-orb">M</div><p className="vf-eyebrow">MYSTOREY</p><h1>Vous avez oublié votre mot de passe ?</h1><p className="muted">Indiquez l’adresse email de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>{state.success?<p className="form-success" role="status">{state.success}</p>:<><label className="field"><span>Adresse email</span><input required name="email" type="email" autoComplete="email" defaultValue={state.email ?? ""} aria-invalid={state.fieldErrors?.email?.[0]?true:undefined}/>{state.fieldErrors?.email?.[0]&&<small>{state.fieldErrors?.email?.[0]}</small>}</label>{state.error&&<p className="form-error" role="alert">{state.error}</p>}<button className="vf-button" disabled={pending}>{pending?"Envoi…":"Envoyer le lien de récupération"}</button></>}<p className="muted auth-switch"><Link href="/login">Retour à la connexion</Link></p></form>;
}