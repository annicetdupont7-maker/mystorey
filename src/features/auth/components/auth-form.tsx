"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register } from "../actions";
import { ResendConfirmation } from "./resend-confirmation";
import { PasswordField } from "./password-field";
import type { ActionState } from "../schemas";
const initial: ActionState = {};
export function AuthForm({ mode, callbackError, resetSuccess, signedOut }: { mode: "login" | "register"; callbackError?: boolean; resetSuccess?: boolean; signedOut?: boolean }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, initial);
  const [email, setEmail] = useState("");
  const isLogin = mode === "login";
  // After a failed submit React resets uncontrolled fields; the server hands the name back
  // so a typo in the email never costs her the whole form.
  const nameKey = `name-${state.displayName ?? ""}-${state.error ?? ""}`;
  return (
    <div className="auth-shell">
      <section className="auth-panel auth-panel--form">
        <form className="auth-form" action={action} noValidate={false}>
          <Link href="/" className="auth-orb" aria-label="Retour à l’accueil MYSTOREY">M</Link>
          <p className="vf-eyebrow">MYSTOREY</p>
          <h1>{isLogin ? "Content de vous revoir" : "Créez votre boutique gratuite"}</h1>
          <p className="muted">{isLogin ? "Connectez-vous pour retrouver votre boutique, vos produits et vos commandes." : "2 minutes pour créer votre compte. Ensuite, on vous guide étape par étape jusqu’à votre lien de boutique."}</p>
          {callbackError && <p className="form-error" role="alert">Le lien de confirmation est invalide ou expiré. Connectez-vous ou renvoyez l’email.</p>}
          {resetSuccess && <p className="form-success" role="status">Votre mot de passe a été mis à jour. Connectez-vous avec votre nouveau mot de passe.</p>}
          {signedOut && <p className="form-success" role="status">Déconnexion réussie. À très vite !</p>}
          {!isLogin && <Field key={nameKey} label="Votre prénom" name="displayName" autoComplete="given-name" defaultValue={state.displayName} error={state.fieldErrors?.displayName?.[0]} placeholder="Ex. : Awa" />}
          <Field label="Adresse email" name="email" type="email" autoComplete="email" inputMode="email" error={state.fieldErrors?.email?.[0]} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
          <PasswordField label={isLogin ? "Mot de passe" : "Choisissez un mot de passe (8 caractères minimum)"} name="password" autoComplete={isLogin ? "current-password" : "new-password"} error={state.fieldErrors?.password?.[0]} />
          {isLogin && <span className="auth-forgot"><Link href="/forgot-password">Mot de passe oublié ?</Link></span>}
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          {state.success && <p className="form-success" role="status">{state.success}</p>}
          {isLogin && state.reason === "email_not_confirmed" && <ResendConfirmation email={state.email ?? email} />}
          {!isLogin && state.success && !state.reason && <ResendConfirmation email={state.email ?? email} />}
          <button className="vf-button" disabled={pending}>{pending ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte"}</button>
          {!isLogin && <p className="auth-legal muted">En créant un compte, vous acceptez les <Link href="/conditions-utilisation">conditions d’utilisation</Link>. Gratuit, sans carte bancaire.</p>}
          <p className="muted auth-switch">{isLogin ? "Pas encore de boutique ?" : "Vous avez déjà un compte ?"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Créer ma boutique" : "Se connecter"}</Link></p>
        </form>
      </section>
    </div>
  );
}
function Field({ label, name, type = "text", autoComplete, error, value, defaultValue, onChange, placeholder, inputMode }: { label: string; name: string; type?: string; autoComplete: string; error?: string; value?: string; defaultValue?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required name={name} type={type} autoComplete={autoComplete} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} inputMode={inputMode} aria-invalid={error ? true : undefined} autoCapitalize={type === "email" ? "none" : undefined} />
      {error && <small>{error}</small>}
    </label>
  );
}
