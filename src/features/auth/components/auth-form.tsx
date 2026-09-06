"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register } from "../actions";
import { ResendConfirmation } from "./resend-confirmation";
import { PasswordField } from "./password-field";
import type { ActionState } from "../schemas";
const initial: ActionState = {};
export function AuthForm({ mode, callbackError, resetSuccess }: { mode: "login" | "register"; callbackError?: boolean; resetSuccess?: boolean }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, initial);
  const [email, setEmail] = useState("");
  const isLogin = mode === "login";
  return (
    <div className="auth-shell">
      <section className="auth-panel auth-panel--form">
        <form className="auth-form" action={action}>
          <div className="auth-orb">M</div>
          <p className="vf-eyebrow">MYSTOREY</p>
          <h1>{isLogin ? "Bienvenue sur MYSTOREY" : "Créez votre espace vendeur."}</h1>
          <p className="muted">{isLogin ? "Connectez-vous à votre espace et reprenez le fil de votre boutique." : "Votre univers mérite une belle boutique, simple et humaine."}</p>
          {callbackError && <p className="form-error" role="alert">Le lien de confirmation est invalide ou expiré. Connectez-vous ou renvoyez l’email.</p>}
          {resetSuccess && <p className="form-success" role="status">Votre mot de passe a été mis à jour. Connectez-vous avec votre nouveau mot de passe.</p>}
          {!isLogin && <Field label="Votre nom" name="displayName" autoComplete="name" error={state.fieldErrors?.displayName?.[0]} />}
          <Field label="Adresse email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email?.[0]} value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordField label="Mot de passe" name="password" autoComplete={isLogin ? "current-password" : "new-password"} error={state.fieldErrors?.password?.[0]} />
          {isLogin && <span className="auth-forgot"><Link href="/forgot-password">Mot de passe oublié ?</Link></span>}
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          {state.success && <p className="form-success" role="status">{state.success}</p>}
          {isLogin && state.reason === "email_not_confirmed" && <ResendConfirmation email={state.email ?? email} />}
          {!isLogin && state.success && !state.reason && <ResendConfirmation email={state.email ?? email} />}
          <button className="vf-button" disabled={pending}>{pending ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte"}</button>
          <p className="muted auth-switch">{isLogin ? "Nouveau sur MYSTOREY ?" : "Vous avez déjà un compte ?"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Créer un compte" : "Se connecter"}</Link></p>
        </form>
      </section>
    </div>
  );
}
function Field({ label, name, type = "text", autoComplete, error, value, onChange }: { label: string; name: string; type?: string; autoComplete: string; error?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required name={name} type={type} autoComplete={autoComplete} value={value} onChange={onChange} />
      {error && <small>{error}</small>}
    </label>
  );
}
