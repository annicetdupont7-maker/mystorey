"use client";
import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "../actions";
import { PasswordField } from "./password-field";
export function UpdatePasswordForm(){
  const [state,action,pending]=useActionState(updatePassword,{});
  return <form className="auth-form" action={action}><div className="auth-orb">M</div><p className="vf-eyebrow">MYSTOREY</p><h1>Choisissez un nouveau mot de passe.</h1><p className="muted">Utilisez au moins 8 caractères. Votre ancien mot de passe cessera de fonctionner.</p><PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" error={state.fieldErrors?.password?.[0]}/><PasswordField label="Confirmez le nouveau mot de passe" name="confirmPassword" autoComplete="new-password" error={state.fieldErrors?.confirmPassword?.[0]}/>{state.error&&<p className="form-error" role="alert">{state.error}</p>}<button className="vf-button" disabled={pending}>{pending?"Mise à jour…":"Mettre à jour le mot de passe"}</button><p className="muted auth-switch"><Link href="/login">Retour à la connexion</Link></p></form>;
}