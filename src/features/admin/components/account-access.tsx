"use client";
import { useActionState } from "react";
import { KeyRound, Loader2, Mail, MessageCircle } from "lucide-react";
import { generatePasswordResetLink, updateUserEmail, type AdminActionState, type ResetLinkState } from "@/features/admin/actions";
import { CopyLinkButton } from "@/features/sharing/components/copy-link-button";

const digits = (value: string) => value.replace(/\D/g, "");

/**
 * Getting a seller back into her account without email: a reset link to send on
 * WhatsApp, and a fix for a mistyped address.
 */
export function AccountAccess({ userId, name, email, whatsapp }: { userId: string; name: string; email: string | null; whatsapp: string | null }) {
  const [linkState, linkAction, linkPending] = useActionState<ResetLinkState, FormData>(generatePasswordResetLink, {});
  const [emailState, emailAction, emailPending] = useActionState<AdminActionState, FormData>(updateUserEmail, {});
  const message = linkState.link
    ? `Bonjour ${name} 👋 Voici votre lien pour choisir un nouveau mot de passe MYSTOREY (valable 1 heure) : ${linkState.link}`
    : "";
  const phone = whatsapp && digits(whatsapp).length >= 8 ? digits(whatsapp) : null;
  const waHref = linkState.link ? `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(message)}` : "";

  return (
    <div className="account-access">
      <div className="account-access-block">
        <p className="account-access-title"><KeyRound size={16} aria-hidden="true" /> Mot de passe oublié</p>
        <p className="muted">Générez un lien et envoyez-le à la personne sur WhatsApp. Elle choisit elle-même son nouveau mot de passe. Le lien est valable 1 heure et ne sert qu’une fois.</p>
        <form action={linkAction}>
          <input type="hidden" name="userId" value={userId} />
          <button className="vf-button vf-button--sm" disabled={linkPending}>
            {linkPending ? <><Loader2 className="spin" size={14} aria-hidden="true" /> Génération…</> : "Générer un lien de réinitialisation"}
          </button>
        </form>
        {linkState.error && <p className="form-error" role="alert">{linkState.error}</p>}
        {linkState.link && (
          <div className="account-access-link">
            <input readOnly value={linkState.link} aria-label="Lien de réinitialisation" onFocus={(e) => e.currentTarget.select()} />
            <div className="account-access-actions">
              <a className="vf-button vf-button--sm" href={waHref} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" /> {phone ? "Envoyer sur son WhatsApp" : "Envoyer sur WhatsApp"}</a>
              <CopyLinkButton url={linkState.link} className="vf-button vf-button--ghost vf-button--sm" />
            </div>
            <small className="muted">⚠️ N’ouvrez pas ce lien vous-même : il connecterait votre navigateur à ce compte.</small>
          </div>
        )}
      </div>

      <div className="account-access-block">
        <p className="account-access-title"><Mail size={16} aria-hidden="true" /> Corriger l’adresse email</p>
        <p className="muted">En cas de faute de frappe à l’inscription. Le mot de passe, la boutique et les commandes ne changent pas.</p>
        <form action={emailAction} className="account-access-email" onSubmit={(event) => { if (!window.confirm("Changer l’adresse de connexion de ce compte ?")) event.preventDefault(); }}>
          <input type="hidden" name="userId" value={userId} />
          <input name="email" type="email" required defaultValue={email ?? ""} aria-label="Nouvelle adresse email" autoCapitalize="none" />
          <button className="vf-button vf-button--ghost vf-button--sm" disabled={emailPending}>{emailPending ? "Enregistrement…" : "Enregistrer"}</button>
        </form>
        {emailState.error && <p className="form-error" role="alert">{emailState.error}</p>}
        {emailState.success && <p className="form-success" role="status">{emailState.success}</p>}
      </div>
    </div>
  );
}
