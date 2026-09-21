"use client";
import { useActionState, useState } from "react";
import { Bug, HelpCircle, Lightbulb, Loader2, Send } from "lucide-react";
import { sendFeedback } from "../actions";
import { FEEDBACK_KIND_LABELS, type FeedbackActionState, type FeedbackKind } from "../schemas";

const ICONS = { problem: Bug, suggestion: Lightbulb, help: HelpCircle } as const;
const PLACEHOLDERS: Record<FeedbackKind, string> = {
  problem: "Ex. : quand j’ajoute une photo, le bouton reste bloqué…",
  suggestion: "Ex. : j’aimerais pouvoir indiquer les frais de livraison…",
  help: "Ex. : je ne sais pas comment ajouter plusieurs couleurs à ma robe…",
};

export function FeedbackForm({ defaultContact }: { defaultContact: string }) {
  const [state, action, pending] = useActionState<FeedbackActionState, FormData>(sendFeedback, {});
  const [kind, setKind] = useState<FeedbackKind>("help");
  // A fresh key after success empties the textarea for the next message.
  const formKey = state.successId ? `sent-${state.successId}` : "form";
  return (
    <form className="feedback-form panel" action={action} key={formKey}>
      <input type="hidden" name="page" value="/dashboard/help" />
      <fieldset className="feedback-kinds">
        <legend>De quoi avez-vous besoin ?</legend>
        {(Object.keys(FEEDBACK_KIND_LABELS) as FeedbackKind[]).map((value) => {
          const Icon = ICONS[value];
          return (
            <label key={value} className={`feedback-kind${kind === value ? " is-selected" : ""}`}>
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
              <Icon size={18} aria-hidden="true" />
              <span>{FEEDBACK_KIND_LABELS[value]}</span>
            </label>
          );
        })}
      </fieldset>
      <label className="field">
        <span>Votre message</span>
        <textarea name="message" rows={5} maxLength={2000} required placeholder={PLACEHOLDERS[kind]} />
        {state.fieldErrors?.message && <small className="field-error">{state.fieldErrors.message[0]}</small>}
      </label>
      <label className="field">
        <span>Où vous répondre ? (WhatsApp ou email)</span>
        <input name="contact" defaultValue={defaultContact} maxLength={120} placeholder="+229 97 00 00 00" />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <button className="vf-button" disabled={pending}>
        {pending ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Envoi…</> : <><Send size={16} aria-hidden="true" /> Envoyer à l’équipe</>}
      </button>
    </form>
  );
}
